// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'STATE_UPDATE') render(msg.state);
  });

  const state = await queryState();
  render(state ?? idleState());
}

function idleState() {
  return { phase: 'IDLE', element1: null, element2: null, diff: null, error: null };
}

async function queryState() {
  const tab = await getActiveTab();
  if (!tab) return null;
  try { return await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATE' }); }
  catch { return null; }
}

// ── Render ────────────────────────────────────────────────────────────────────
function render(state) {
  const { phase, element1, element2, error } = state;

  const statusMap = {
    IDLE:         ['Selecciona dos elementos para comparar', 'idle'],
    SELECTING_1:  ['Haz click en un elemento de la página…', 'picking'],
    SELECTING_2:  ['Ahora selecciona el Elemento 2…', 'picking'],
    SHOWING_DIFF: ['Diff listo — revisa el panel lateral', 'done'],
  };
  const [msg, cls] = statusMap[phase] ?? ['', 'idle'];
  setStatus(msg, cls);

  setBadge('badge1', element1?.selector ?? null);
  setBadge('badge2', element2?.selector ?? null);

  document.getElementById('slot1').classList.toggle('active', phase === 'SELECTING_1');
  document.getElementById('slot2').classList.toggle('active', phase === 'SELECTING_2');

  const pick1 = document.getElementById('pick1');
  const pick2 = document.getElementById('pick2');
  pick1.disabled = phase === 'SELECTING_1' || phase === 'SHOWING_DIFF';
  pick1.classList.toggle('active', phase === 'SELECTING_1');
  pick2.disabled = phase === 'SELECTING_2' || phase === 'SHOWING_DIFF' || (phase === 'IDLE' && !element1);
  pick2.classList.toggle('active', phase === 'SELECTING_2');

  const errBox = document.getElementById('error-box');
  if (error) { errBox.textContent = error; errBox.classList.remove('hidden'); }
  else        { errBox.classList.add('hidden'); }

  // Cuando hay diff: mostrar aviso con flecha al side panel
  document.getElementById('diff-hint').classList.toggle('hidden', phase !== 'SHOWING_DIFF');
  document.getElementById('reset-btn').classList.toggle('hidden', phase === 'IDLE');
}

function setStatus(text, cls) {
  const bar = document.getElementById('status-bar');
  bar.textContent = text;
  bar.className = 'status ' + cls;
}

function setBadge(id, selector) {
  const badge = document.getElementById(id);
  if (selector) { badge.textContent = selector; badge.classList.add('selected'); }
  else          { badge.textContent = 'no seleccionado'; badge.classList.remove('selected'); }
}

// ── Messaging ─────────────────────────────────────────────────────────────────
async function send(msg) {
  const tab = await getActiveTab();
  if (!tab) return;
  try {
    await chrome.tabs.sendMessage(tab.id, msg);
  } catch {
    // Content script not yet in this tab (opened before extension loaded).
    // Inject it on the fly and retry once.
    const ok = await tryInject(tab);
    if (ok) {
      try { await chrome.tabs.sendMessage(tab.id, msg); return; } catch { /* fall through */ }
    }
    setStatus('No se puede acceder a esta página.', 'error');
  }
}

async function tryInject(tab) {
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
    await new Promise(r => setTimeout(r, 150));
    return true;
  } catch {
    return false;
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

// ── Events ────────────────────────────────────────────────────────────────────
document.getElementById('pick1').addEventListener('click', () => send({ type: 'START_PICK', slot: 1 }));
document.getElementById('pick2').addEventListener('click', () => send({ type: 'START_PICK', slot: 2 }));

document.getElementById('use1').addEventListener('click', () => {
  const val = document.getElementById('selector1').value.trim();
  if (val) send({ type: 'SELECTOR_SUBMIT', slot: 1, value: val });
});
document.getElementById('use2').addEventListener('click', () => {
  const val = document.getElementById('selector2').value.trim();
  if (val) send({ type: 'SELECTOR_SUBMIT', slot: 2, value: val });
});

document.getElementById('selector1').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('use1').click();
});
document.getElementById('selector2').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('use2').click();
});

document.getElementById('reset-btn').addEventListener('click', () => send({ type: 'RESET' }));

init();

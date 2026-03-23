const STORAGE_KEY_SELECTORS = 'hdc_saved_selectors';
const STORAGE_KEY_REGEX     = 'hdc_regex_list';
const RX_SLOTS = 5;

let regexList = [];

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'STATE_UPDATE') render(msg.state);
  });

  const tab   = await getActiveTab();
  const state = await queryState();
  render(state ?? idleState());

  if (tab) await loadSavedSelectors(tab);
  await loadRegexList();

  // Regex section events
  document.getElementById('rx-add-btn').addEventListener('click', handleRegexAdd);
  document.getElementById('rx-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleRegexAdd();
  });
  document.getElementById('rx-chips').addEventListener('click', e => {
    const btn = e.target.closest('.rx-chip-del');
    if (btn) removeRegex(parseInt(btn.dataset.i));
  });
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

// ── Selector persistence ───────────────────────────────────────────────────────
function urlKey(url) {
  try { const u = new URL(url); return u.origin + u.pathname; }
  catch { return url; }
}

async function loadSavedSelectors(tab) {
  if (!tab?.url) return;
  const { [STORAGE_KEY_SELECTORS]: all } = await chrome.storage.local.get(STORAGE_KEY_SELECTORS);
  const saved = all?.[urlKey(tab.url)];
  if (!saved) return;
  if (saved.sel1) document.getElementById('selector1').value = saved.sel1;
  if (saved.sel2) document.getElementById('selector2').value = saved.sel2;
}

async function saveSelectors(url, sel1, sel2) {
  if (!url || !sel1 || !sel2) return;
  const { [STORAGE_KEY_SELECTORS]: all } = await chrome.storage.local.get(STORAGE_KEY_SELECTORS);
  const updated = { ...(all ?? {}), [urlKey(url)]: { sel1, sel2 } };
  chrome.storage.local.set({ [STORAGE_KEY_SELECTORS]: updated });
}

// ── Regex list persistence ─────────────────────────────────────────────────────
async function loadRegexList() {
  const { [STORAGE_KEY_REGEX]: saved } = await chrome.storage.local.get(STORAGE_KEY_REGEX);
  regexList = saved ?? [];
  renderRegexChips();
  updateNextDot();
}

function saveRegexList() {
  chrome.storage.local.set({ [STORAGE_KEY_REGEX]: regexList });
}

function handleRegexAdd() {
  const input = document.getElementById('rx-input');
  const errEl = document.getElementById('rx-error');
  const pattern = input.value.trim();

  if (!pattern) return;

  try { new RegExp(pattern); } catch {
    showRxError('Regex inválido');
    return;
  }
  if (regexList.includes(pattern)) {
    showRxError('Ya existe ese patrón');
    return;
  }

  errEl.classList.add('hidden');
  regexList.push(pattern);
  saveRegexList();
  renderRegexChips();
  updateNextDot();
  input.value = '';
  input.focus();
}

function removeRegex(idx) {
  regexList.splice(idx, 1);
  saveRegexList();
  renderRegexChips();
  updateNextDot();
}

function showRxError(msg) {
  const errEl = document.getElementById('rx-error');
  errEl.textContent = msg;
  errEl.classList.remove('hidden');
  setTimeout(() => errEl.classList.add('hidden'), 2000);
}

function renderRegexChips() {
  const container = document.getElementById('rx-chips');
  container.innerHTML = regexList.map((pat, i) =>
    `<span class="rx-chip rx-chip-${i % RX_SLOTS}">` +
    `<span class="rx-chip-swatch"></span>` +
    `<span class="rx-chip-text">${escHtml(pat)}</span>` +
    `<button class="rx-chip-del" data-i="${i}" title="Eliminar">×</button>` +
    `</span>`
  ).join('');
  container.classList.toggle('hidden', regexList.length === 0);
}

function updateNextDot() {
  const dot = document.getElementById('rx-next-dot');
  const nextSlot = regexList.length % RX_SLOTS;
  dot.className = `rx-dot rx-dot-${nextSlot}`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

  document.getElementById('diff-hint').classList.toggle('hidden', phase !== 'SHOWING_DIFF');
  document.getElementById('reset-btn').classList.toggle('hidden', phase === 'IDLE');

  if (phase === 'SHOWING_DIFF' && element1?.selector && element2?.selector) {
    getActiveTab().then(tab => {
      if (tab?.url) saveSelectors(tab.url, element1.selector, element2.selector);
    });
  }
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

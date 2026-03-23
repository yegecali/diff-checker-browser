// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  const tab = await getActiveTab();
  if (!tab) return;

  // Listen for state pushes from content script
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'STATE_UPDATE') render(msg.state);
  });

  // Request current state
  try {
    const state = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATE' });
    render(state);
  } catch {
    setStatus('Cannot run on this page.', 'error');
  }
}

// ── Render ────────────────────────────────────────────────────────────────────
function render(state) {
  const { phase, element1, element2, diff, error } = state;

  // Status bar
  const statusMap = {
    IDLE:         ['Ready — pick two elements to compare', 'idle'],
    SELECTING_1:  ['Click an element on the page for Element 1… (Esc to cancel)', 'picking'],
    SELECTING_2:  ['Now click Element 2 on the page… (Esc to cancel)', 'picking'],
    SHOWING_DIFF: ['Diff complete ✓', 'done'],
  };
  const [msg, cls] = statusMap[phase] ?? ['', 'idle'];
  setStatus(msg, cls);

  // Badges
  setBadge('badge1', element1?.selector ?? null);
  setBadge('badge2', element2?.selector ?? null);

  // Slot active highlight
  document.getElementById('slot1').classList.toggle('active', phase === 'SELECTING_1');
  document.getElementById('slot2').classList.toggle('active', phase === 'SELECTING_2');

  // Pick buttons
  const pick1 = document.getElementById('pick1');
  const pick2 = document.getElementById('pick2');
  pick1.disabled = phase === 'SELECTING_1';
  pick1.classList.toggle('active', phase === 'SELECTING_1');
  pick2.disabled = phase === 'SELECTING_2' || phase === 'IDLE' && !element1;
  pick2.classList.toggle('active', phase === 'SELECTING_2');

  // Error
  const errBox = document.getElementById('error-box');
  if (error) {
    errBox.textContent = error;
    errBox.classList.remove('hidden');
  } else {
    errBox.classList.add('hidden');
  }

  // Diff section
  const diffSection = document.getElementById('diff-section');
  if (phase === 'SHOWING_DIFF' && diff) {
    diffSection.classList.remove('hidden');
    renderDiff(diff);
  } else {
    diffSection.classList.add('hidden');
  }
}

function setStatus(text, cls) {
  const bar = document.getElementById('status-bar');
  bar.textContent = text;
  bar.className = 'status ' + cls;
}

function setBadge(id, selector) {
  const badge = document.getElementById(id);
  if (selector) {
    badge.textContent = selector;
    badge.classList.add('selected');
  } else {
    badge.textContent = 'not selected';
    badge.classList.remove('selected');
  }
}

// ── Diff render in popup ──────────────────────────────────────────────────────
function renderDiff(changes) {
  const output = document.getElementById('diff-output');
  let adds = 0, dels = 0;

  const html = changes.map(change => {
    const lines = change.value.replace(/\n$/, '').split('\n');
    return lines.map(line => {
      const escaped = escapeHTML(line);
      if (change.added)   { adds++; return `<span class="d-ins">+ ${escaped}</span>`; }
      if (change.removed) { dels++; return `<span class="d-del">- ${escaped}</span>`; }
      return `<span class="d-eq">  ${escaped}</span>`;
    }).join('');
  }).join('');

  output.innerHTML = html;

  document.getElementById('diff-stats').textContent =
    `+${adds} added · -${dels} removed`;
}

// ── Messaging ─────────────────────────────────────────────────────────────────
async function send(msg) {
  const tab = await getActiveTab();
  if (!tab) return;
  try {
    await chrome.tabs.sendMessage(tab.id, msg);
  } catch {
    setStatus('Page not ready. Try reloading it.', 'error');
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

// ── Event wiring ──────────────────────────────────────────────────────────────
document.getElementById('pick1').addEventListener('click', () =>
  send({ type: 'START_PICK', slot: 1 }));

document.getElementById('pick2').addEventListener('click', () =>
  send({ type: 'START_PICK', slot: 2 }));

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

document.getElementById('reset-btn').addEventListener('click', () =>
  send({ type: 'RESET' }));

// ── Utils ─────────────────────────────────────────────────────────────────────
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

init();

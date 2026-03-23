import { diffWords } from 'diff';

// ── Constants ─────────────────────────────────────────────────────────────────
const STORAGE_KEY_REGEX = 'hdc_regex_list';
const RX_SLOTS = 5;

// ── State ─────────────────────────────────────────────────────────────────────
let currentTabId = null;
let lastDiff     = null; // { changes, sel1, sel2 }
let regexList    = [];   // string[] — loaded from storage, updated via onChanged

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const tab = await getActiveTab();
  currentTabId = tab?.id ?? null;

  // Only render STATE_UPDATE from the tab currently visible in this panel
  chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg.type === 'STATE_UPDATE' && sender.tab?.id === currentTabId) {
      render(msg.state);
    }
  });

  // User switched to a different tab
  chrome.tabs.onActivated.addListener(async (info) => {
    currentTabId = info.tabId;
    const state = await queryState();
    render(state ?? idleState());
  });

  // Current tab navigated — content script reloaded, state is gone
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (tabId === currentTabId && changeInfo.status === 'loading') {
      render(idleState());
    }
  });

  // Regex list changed from the popup — re-apply highlights immediately
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEY_REGEX]) {
      regexList = changes[STORAGE_KEY_REGEX].newValue ?? [];
      reapplyHighlights();
    }
  });

  document.getElementById('copy-btn').addEventListener('click', handleCopy);

  await loadRegexList();

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

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

// ── Regex list (read-only here — popup owns writes) ───────────────────────────
async function loadRegexList() {
  const { [STORAGE_KEY_REGEX]: saved } = await chrome.storage.local.get(STORAGE_KEY_REGEX);
  regexList = saved ?? [];
}

// ── Highlight engine ──────────────────────────────────────────────────────────
function reapplyHighlights() {
  const left  = document.getElementById('col-left');
  const right = document.getElementById('col-right');
  if (!left || !right) return;
  applyRegexHighlights(left);
  applyRegexHighlights(right);
}

function applyRegexHighlights(container) {
  // Strip previous rx highlights (restore plain text nodes)
  container.querySelectorAll('span.rx-hl').forEach(el => {
    el.replaceWith(document.createTextNode(el.textContent));
  });
  container.normalize();

  regexList.forEach((pattern, colorIdx) => {
    let re;
    try { re = new RegExp(pattern, 'gi'); } catch { return; }

    // Collect text nodes first (walker invalidates mid-mutation)
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);

    nodes.forEach(textNode => {
      const text = textNode.textContent;
      const parts = [];
      let last = 0;
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        if (m[0].length === 0) { re.lastIndex++; continue; }
        if (m.index > last) parts.push(document.createTextNode(text.slice(last, m.index)));
        const span = document.createElement('span');
        span.className = `rx-hl rx-${colorIdx % RX_SLOTS}`;
        span.textContent = m[0];
        parts.push(span);
        last = m.index + m[0].length;
      }
      if (parts.length) {
        if (last < text.length) parts.push(document.createTextNode(text.slice(last)));
        textNode.replaceWith(...parts);
      }
    });
  });
}

// ── Render ────────────────────────────────────────────────────────────────────
function render(state) {
  const { phase, element1, element2, diff } = state;
  const hasResult = phase === 'SHOWING_DIFF' && diff;

  document.getElementById('placeholder').classList.toggle('hidden', hasResult);
  document.getElementById('result').classList.toggle('hidden', !hasResult);

  if (!hasResult) {
    const msgs = {
      IDLE:        'Selecciona dos elementos con el formulario de la extensión.',
      SELECTING_1: 'Seleccionando Elemento 1 en la página…',
      SELECTING_2: 'Seleccionando Elemento 2 en la página…',
    };
    document.getElementById('placeholder-msg').textContent = msgs[phase] ?? '';
    lastDiff = null;
    return;
  }

  lastDiff = {
    changes: diff,
    sel1: element1?.selector ?? 'elemento-1',
    sel2: element2?.selector ?? 'elemento-2',
  };
  renderDiff(diff, element1, element2);
}

// ── Copy ──────────────────────────────────────────────────────────────────────
async function handleCopy() {
  if (!lastDiff) return;
  const text = buildUnifiedDiff(lastDiff.changes, lastDiff.sel1, lastDiff.sel2);
  try {
    await navigator.clipboard.writeText(text);
    flashBtn('copy-btn', '✓ Copiado');
  } catch {
    flashBtn('copy-btn', '✗ Error');
  }
}

function flashBtn(id, msg) {
  const btn = document.getElementById(id);
  const orig = btn.textContent;
  btn.textContent = msg;
  btn.disabled = true;
  setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1500);
}

function buildUnifiedDiff(changes, sel1, sel2) {
  const lines = [`--- ${sel1}`, `+++ ${sel2}`];
  changes.forEach(c => {
    const content = c.value.replace(/\n$/, '').split('\n');
    if (c.removed)    content.forEach(l => lines.push(`-${l}`));
    else if (c.added) content.forEach(l => lines.push(`+${l}`));
    else              content.forEach(l => lines.push(` ${l}`));
  });
  return lines.join('\n');
}

// ── Diff rendering ────────────────────────────────────────────────────────────
function enrichWithWordDiff(changes) {
  const result = [];
  let i = 0;
  while (i < changes.length) {
    const cur = changes[i], next = changes[i + 1];
    if (cur.removed && next?.added) {
      result.push({ type: 'word-diff', wordDiff: diffWords(cur.value, next.value) });
      i += 2;
    } else {
      result.push({ type: 'line', change: cur });
      i++;
    }
  }
  return result;
}

function buildColHTML(enriched, side) {
  const isLeft = side === 'left';
  return enriched.map(item => {
    if (item.type === 'word-diff') {
      const cls = isLeft ? 'd-del' : 'd-ins';
      const g   = isLeft ? '-' : '+';
      const html = item.wordDiff.map(w => {
        if (isLeft && w.added)    return '';
        if (!isLeft && w.removed) return '';
        const t = escHtml(w.value);
        if (w.removed) return `<mark class="d-word-del">${t}</mark>`;
        if (w.added)   return `<mark class="d-word-ins">${t}</mark>`;
        return t;
      }).join('');
      return html.split('\n').filter(l => l.trim()).map(l =>
        `<div class="d-line ${cls}"><span class="d-g">${g}</span><span class="d-c">${l}</span></div>`
      ).join('');
    }
    const { change: c } = item;
    if (c.added && isLeft)    return '';
    if (c.removed && !isLeft) return '';
    const lines = c.value.replace(/\n$/, '').split('\n');
    if (c.removed) return lines.map(l => `<div class="d-line d-del"><span class="d-g">-</span><span class="d-c">${escHtml(l)}</span></div>`).join('');
    if (c.added)   return lines.map(l => `<div class="d-line d-ins"><span class="d-g">+</span><span class="d-c">${escHtml(l)}</span></div>`).join('');
    return lines.map(l => `<div class="d-line d-eq"><span class="d-g"> </span><span class="d-c">${escHtml(l)}</span></div>`).join('');
  }).join('');
}

function renderDiff(changes, el1, el2) {
  const enriched = enrichWithWordDiff(changes);

  let adds = 0, dels = 0;
  enriched.forEach(item => {
    if (item.type === 'word-diff') {
      item.wordDiff.forEach(w => { if (w.added) adds++; if (w.removed) dels++; });
    } else if (item.change.added)   adds += item.change.value.split('\n').filter(Boolean).length;
      else if (item.change.removed) dels += item.change.value.split('\n').filter(Boolean).length;
  });

  const noChanges = adds === 0 && dels === 0;

  document.getElementById('stats').textContent = noChanges ? 'Sin diferencias' : `-${dels}  +${adds}`;
  document.getElementById('sel1').textContent  = el1?.selector ?? '';
  document.getElementById('sel2').textContent  = el2?.selector ?? '';

  document.getElementById('no-changes').classList.toggle('hidden', !noChanges);
  document.getElementById('cols-wrap').classList.toggle('hidden',   noChanges);
  document.getElementById('copy-btn').classList.toggle('hidden',    noChanges);

  if (!noChanges) {
    document.getElementById('col-left').innerHTML  = buildColHTML(enriched, 'left');
    document.getElementById('col-right').innerHTML = buildColHTML(enriched, 'right');
    reapplyHighlights(); // apply saved regex patterns on fresh render
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

init();

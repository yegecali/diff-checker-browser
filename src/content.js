import { diffLines } from 'diff';

// ── State ─────────────────────────────────────────────────────────────────────
let state = {
  phase: 'IDLE', // IDLE | SELECTING_1 | SELECTING_2 | SHOWING_DIFF
  element1: null, // { el, text, selector }
  element2: null,
  diff: null,
  error: null,
};

let hoveredEl = null;

// ── Message listener ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_STATE') {
    sendResponse(serializeState());
    return true;
  }
  if (msg.type === 'START_PICK') {
    startPickMode(msg.slot);
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === 'SELECTOR_SUBMIT') {
    handleSelectorSubmit(msg.slot, msg.value);
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === 'RESET') {
    resetState();
    sendResponse({ ok: true });
    return true;
  }
});

// ── Pick mode ─────────────────────────────────────────────────────────────────
let clickReady = false; // evita capturar el primer click de transferencia de foco

function startPickMode(slot) {
  state.phase = slot === 1 ? 'SELECTING_1' : 'SELECTING_2';
  state.error = null;
  clickReady = false;

  showPickBanner(slot);

  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('mouseout', onMouseOut, true);
  document.addEventListener('keydown', onKeyDown, true);

  // Delay de 400 ms antes de capturar clicks — le da tiempo al usuario de
  // mover el ratón desde el side panel a la página sin seleccionar por accidente
  setTimeout(() => {
    clickReady = true;
    document.addEventListener('click', onClick, true);
  }, 400);

  broadcastState();
}

function onMouseOver(e) {
  if (isPickUI(e.target)) return;
  if (hoveredEl && hoveredEl !== e.target) hoveredEl.classList.remove('hdc-hover');
  hoveredEl = e.target;
  hoveredEl.classList.add('hdc-hover');
}

function onMouseOut(e) {
  if (e.target === hoveredEl) {
    hoveredEl.classList.remove('hdc-hover');
    hoveredEl = null;
  }
}

function onClick(e) {
  if (!clickReady) return;
  if (isPickUI(e.target)) return;
  e.preventDefault();
  e.stopPropagation();
  const slot = state.phase === 'SELECTING_1' ? 1 : 2;
  captureElement(slot, e.target);
  exitPickMode();
}

function onKeyDown(e) {
  if (e.key === 'Escape') {
    exitPickMode();
    state.phase = state.element1 ? 'SELECTING_2' : 'IDLE';
    broadcastState();
  }
}

function exitPickMode() {
  clickReady = false;
  document.removeEventListener('mouseover', onMouseOver, true);
  document.removeEventListener('mouseout', onMouseOut, true);
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('keydown', onKeyDown, true);
  if (hoveredEl) {
    hoveredEl.classList.remove('hdc-hover');
    hoveredEl = null;
  }
  removePickBanner();
}

// ── Banner de pick mode ───────────────────────────────────────────────────────
function showPickBanner(slot) {
  removePickBanner();
  const banner = document.createElement('div');
  banner.id = 'hdc-pick-banner';
  banner.setAttribute('role', 'alert');
  banner.setAttribute('aria-live', 'polite');
  banner.innerHTML =
    `<span class="hdc-pick-dot"></span>` +
    `<span>Selecciona el <strong>Elemento ${slot}</strong> — haz click en cualquier elemento de la página</span>` +
    `<button id="hdc-pick-cancel" aria-label="Cancelar selección">✕ Cancelar (Esc)</button>`;
  document.body.appendChild(banner);
  requestAnimationFrame(() => banner.classList.add('hdc-pick-banner-visible'));
  const cancelBtn = document.getElementById('hdc-pick-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', e => {
      e.stopPropagation();
      exitPickMode();
      state.phase = state.element1 ? 'SELECTING_2' : 'IDLE';
      broadcastState();
    });
  }
}

function removePickBanner() {
  document.getElementById('hdc-pick-banner')?.remove();
}

function isPickUI(el) {
  return el.closest('#hdc-pick-banner') !== null || el.closest('#hdc-toast') !== null;
}

// ── Selector submit ───────────────────────────────────────────────────────────
function handleSelectorSubmit(slot, value) {
  const trimmed = value.trim();
  if (!trimmed) return;

  let el = null;
  try {
    el = document.querySelector(trimmed);
  } catch (_) {
    // Invalid selector - will try getElementById fallback
  }
  if (!el) {
    try {
      el = document.getElementById(trimmed.replace(/^#/, ''));
    } catch (_) {
      // Invalid ID - element not found
    }
  }

  if (!el) {
    state.error = `No element found: "${trimmed}"`;
    broadcastState();
    return;
  }

  state.error = null;
  captureElement(slot, el);
}

// ── Capture ───────────────────────────────────────────────────────────────────
function captureElement(slot, el) {
  if (slot === 1) {
    if (state.element1) state.element1.el.classList.remove('hdc-selected-1');
    state.element1 = { el, text: extractText(el), selector: generateSelector(el) };
    state.phase = 'SELECTING_2';
    el.classList.add('hdc-selected-1');
    showToast('✓ Elemento 1 seleccionado — ahora selecciona el Elemento 2', 'info');
  } else {
    if (state.element2) state.element2.el.classList.remove('hdc-selected-2');
    state.element2 = { el, text: extractText(el), selector: generateSelector(el) };
    state.phase = 'SHOWING_DIFF';
    el.classList.add('hdc-selected-2');
    showToast('✓ Elemento 2 seleccionado — generando diff…', 'success');
    runDiff();
  }
  broadcastState();
}

// ── Diff ──────────────────────────────────────────────────────────────────────
function runDiff() {
  state.diff = diffLines(normalizeText(state.element1.text), normalizeText(state.element2.text));
}

function extractText(el) {
  return el.innerText ?? el.textContent ?? '';
}

function normalizeText(text) {
  return (
    text
      .split('\n')
      .map(l => l.trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim() + '\n'
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer = null;

function showToast(message, type = 'info') {
  let toast = document.getElementById('hdc-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'hdc-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `hdc-toast-${type}`;
  toast.classList.add('hdc-toast-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('hdc-toast-visible'), 3000);
}

// ── Reset ─────────────────────────────────────────────────────────────────────
function resetState() {
  exitPickMode();
  state.element1?.el.classList.remove('hdc-selected-1');
  state.element2?.el.classList.remove('hdc-selected-2');
  state = { phase: 'IDLE', element1: null, element2: null, diff: null, error: null };
  broadcastState();
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function generateSelector(el) {
  if (el.id) return '#' + CSS.escape(el.id);
  const parts = [];
  let cur = el;
  while (cur && cur !== document.body) {
    if (cur.id) {
      parts.unshift('#' + CSS.escape(cur.id));
      break;
    }
    let part = cur.tagName.toLowerCase();
    const siblings = cur.parentElement
      ? Array.from(cur.parentElement.children).filter(c => c.tagName === cur.tagName)
      : [];
    if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(cur) + 1})`;
    parts.unshift(part);
    cur = cur.parentElement;
  }
  return parts.join(' > ');
}

function serializeState() {
  return {
    phase: state.phase,
    element1: state.element1 ? { selector: state.element1.selector } : null,
    element2: state.element2 ? { selector: state.element2.selector } : null,
    diff: state.diff,
    error: state.error,
  };
}

function broadcastState() {
  chrome.runtime.sendMessage({ type: 'STATE_UPDATE', state: serializeState() }).catch(() => {});
}

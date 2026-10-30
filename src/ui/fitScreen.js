// src/ui/fitScreen.js
// One-screen guarantee: every visible screen card / modal is measured at its natural size and,
// when it is taller or wider than the space left for it, shrunk with CSS zoom so all content
// shows and stays tappable without scrolling. Only below MIN_ZOOM does the host fall back to scrolling.

const ROOTS = '.auth-card, .setup-card, .result-card, .modal-card, .lobby-center';
const MIN_ZOOM = 0.55;
const SHADOW_PAD = 10;
// In-game layers update every frame and never contain fit roots
const IGNORE = '#game-container, .hud-overlay, .controls-layer, .admin-dock';

const isShown = (el) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed';

function outerSize(el) {
  const cs = getComputedStyle(el);
  return {
    w: el.offsetWidth + parseFloat(cs.marginLeft) + parseFloat(cs.marginRight),
    h: el.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom)
  };
}

// Height left for `el` inside its host: the host's content box minus its in-flow siblings
function available(el) {
  const host = el.parentElement;
  const cs = getComputedStyle(host);
  let w = host.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  let h = host.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const column = cs.flexDirection.startsWith('column');
  for (const sib of host.children) {
    if (sib === el || !isShown(sib)) continue;
    const pos = getComputedStyle(sib).position;
    if (pos === 'absolute' || pos === 'fixed') continue;
    if (column) h -= outerSize(sib).h;
    else w -= outerSize(sib).w;
  }
  return { w, h };
}

function fit(el) {
  el.style.zoom = '';
  el.parentElement.classList.remove('fit-overflow');
  const { w, h } = available(el);
  const outer = outerSize(el);
  const needW = outer.w + Math.max(0, el.scrollWidth - el.offsetWidth);
  const needH = outer.h + Math.max(0, el.scrollHeight - el.offsetHeight) + SHADOW_PAD;
  const zoom = Math.min(1, w / needW, h / needH);
  if (zoom >= 0.995) return;
  el.style.zoom = Math.max(MIN_ZOOM, Math.floor(zoom * 100) / 100);
  if (zoom < MIN_ZOOM) el.parentElement.classList.add('fit-overflow');
}

let queued = false;
let observer = null;
const OBSERVE = { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden', 'data-ux', 'data-view'] };

function run() {
  queued = false;
  observer.disconnect();
  document.querySelectorAll(ROOTS).forEach((el) => {
    if (isShown(el)) fit(el);
  });
  observer.observe(document.body, OBSERVE);
}

export function scheduleFit() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(run);
}

export function initFitScreen() {
  observer = new MutationObserver((records) => {
    if (records.some((r) => !r.target.closest?.(IGNORE))) scheduleFit();
  });
  observer.observe(document.body, OBSERVE);
  window.addEventListener('resize', scheduleFit);
  window.visualViewport?.addEventListener('resize', scheduleFit);
  document.addEventListener('load', scheduleFit, true);
  document.fonts?.ready.then(scheduleFit);
  scheduleFit();
}

// api.js - integration layer with the Complete Anatomy web app.
// Drives the app's native "Search this model" panel to select a structure by cid,
// and hides the app UI that would reveal the structure's name (breadcrumb + info card).
(function () {
  const CAQ = (window.CAQ = window.CAQ || {});
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const nativeSetValue = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value').set;

  const searchInput = () =>
    [...document.querySelectorAll('input')].find(
      (i) => i.placeholder === 'Search this model');

  const searchToolbarBtn = () =>
    [...document.querySelectorAll('button')].find(
      (b) => (b.textContent || '').trim() === 'Search');

  // App is ready once its toolbar Search button is mounted.
  async function ready(timeout = 60000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (searchToolbarBtn()) return true;
      await sleep(400);
    }
    return false;
  }

  async function ensureSearchOpen() {
    if (searchInput()) return true;
    const btn = searchToolbarBtn();
    if (!btn) return false;
    btn.click();
    for (let i = 0; i < 20; i++) {
      await sleep(120);
      if (searchInput()) return true;
    }
    return false;
  }

  function closeSearchPanel() {
    // The search panel header close button carries aria-label="CLOSE".
    const btn = [...document.querySelectorAll('button')].find(
      (b) => b.getAttribute('aria-label') === 'CLOSE');
    if (btn) btn.click();
  }

  // Reset the model to its original state: un-fades/un-hides everything,
  // deselects, and restores the default camera. Used before each question (for a
  // clean, consistent view) and on quiz exit (to restore the model).
  function resetBtn() {
    return [...document.querySelectorAll('button')].find(
      (b) => /Reset model to original/i.test(b.getAttribute('aria-label') || ''));
  }
  async function resetModel() {
    const b = resetBtn();
    if (b) { b.click(); await sleep(1400); }
  }

  // Fade all structures except the selected one, so a deep/occluded structure is
  // clearly visible in context ON the main 3D model (no isolate modal). This
  // lives behind the selection card's "More view controls" (⋮) menu.
  async function fadeOthers() {
    const more = [...document.querySelectorAll('button')].find(
      (b) => /More view contr/i.test(b.getAttribute('aria-label') || b.textContent || ''));
    if (!more) return false;
    more.click();
    await sleep(450);
    const fo = [...document.querySelectorAll('button')].find(
      (b) => /^Fade others$/i.test((b.textContent || '').trim()));
    if (!fo) return false;
    fo.click();
    await sleep(1200);
    return true;
  }

  // Select a structure by content id and reveal it on the main model: reset for a
  // clean base, select it, then fade everything else so it stands out in context.
  // `name` is the exact model name used as the search query so the row appears.
  async function selectByCid(cid, name) {
    await resetModel();
    if (!(await ensureSearchOpen())) return false;
    const input = searchInput();
    nativeSetValue.call(input, name);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    let row = null;
    for (let i = 0; i < 30; i++) {
      await sleep(120);
      row = document.querySelector(`li[data-testid="structure-item-${cid}"]`);
      if (row) break;
    }
    if (!row) return false;
    (row.querySelector('button') || row).click();
    await sleep(500);
    closeSearchPanel();
    await sleep(250);
    await fadeOthers();
    CAQ.hideSpoilers();
    return true;
  }

  // --- Spoiler hiding ------------------------------------------------------
  // The app shows the selected structure's name in a breadcrumb <nav> and in a
  // top-left info card (the one carrying HIDE / FADE / Isolate). Hide both while
  // a quiz is running. A MutationObserver re-applies hiding across re-renders.
  let observer = null;

  function tagSpoilers() {
    // Info card (name + HIDE/FADE/Isolate), shown when a structure is selected.
    const isolate = [...document.querySelectorAll('button, span, div')].find(
      (e) => e.childElementCount === 0 && (e.textContent || '').trim() === 'Isolate');
    if (isolate) {
      let card = isolate;
      while (card && card !== document.body) {
        const t = card.textContent || '';
        if (/HIDE/.test(t) && /FADE/.test(t) && /Isolate/.test(t) &&
            card.getBoundingClientRect().width < 400) break;
        card = card.parentElement;
      }
      if (card && card !== document.body) card.classList.add('caq-hide');
    }
  }

  CAQ.hideSpoilers = function () {
    document.documentElement.classList.add('caq-quiz-active');
    tagSpoilers();
  };

  CAQ.showSpoilers = function () {
    document.documentElement.classList.remove('caq-quiz-active');
    document.querySelectorAll('.caq-hide').forEach((e) => e.classList.remove('caq-hide'));
  };

  CAQ.startSpoilerWatch = function () {
    if (observer) return;
    let scheduled = false;
    observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      setTimeout(() => {
        scheduled = false;
        if (document.documentElement.classList.contains('caq-quiz-active')) tagSpoilers();
      }, 150);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  CAQ.stopSpoilerWatch = function () {
    if (observer) { observer.disconnect(); observer = null; }
  };

  // --- Loading curtain --------------------------------------------------
  // Opaque overlay shown while a structure is being selected, so the user never
  // sees the app's search panel/typing/results (which reveal the answer).
  CAQ.showCurtain = function (text) {
    let c = document.getElementById('caq-curtain');
    if (!c) {
      c = document.createElement('div');
      c.id = 'caq-curtain';
      c.className = 'caq-root caq-curtain';
      c.innerHTML = '<div class="caq-curtain__box"><div class="caq-spinner"></div>' +
        '<div class="caq-curtain__txt"></div></div>';
      document.body.appendChild(c);
    }
    c.querySelector('.caq-curtain__txt').textContent = text || 'טוען…';
    c.classList.add('caq-curtain--on');
  };
  CAQ.hideCurtain = function () {
    document.getElementById('caq-curtain')?.classList.remove('caq-curtain--on');
  };
  CAQ.removeCurtain = function () { document.getElementById('caq-curtain')?.remove(); };

  CAQ.api = { ready, selectByCid, ensureSearchOpen, closeSearchPanel, resetModel };
})();

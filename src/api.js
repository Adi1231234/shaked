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

  const isolateTitleEl = () =>
    [...document.querySelectorAll('h1, h2, div, span')].find(
      (e) => e.childElementCount === 0 && /^Isolate:/.test((e.textContent || '').trim()));

  function isIsolated() { return !!isolateTitleEl(); }

  // Exit the app's Isolate view (Escape) so the next structure can be selected.
  async function exitIsolate() {
    if (!isIsolated()) return;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
    for (let i = 0; i < 12; i++) { await sleep(120); if (!isIsolated()) break; }
    await sleep(200);
  }

  function isolateBtn() {
    return [...document.querySelectorAll('button, span, div')].find(
      (e) => e.childElementCount === 0 && (e.textContent || '').trim() === 'Isolate');
  }

  // Select a structure by its content id, then Isolate it so it is clearly
  // visible on its own regardless of the current camera/occlusion. `name` is the
  // exact model name used as the search query so the matching row appears.
  async function selectByCid(cid, name) {
    await exitIsolate();
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
    const iso = isolateBtn();
    if (iso) { iso.click(); await sleep(1300); }
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
    // "Isolate: <name>" title shown at the top of the Isolate view.
    const title = isolateTitleEl();
    if (title) title.classList.add('caq-hide');
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

  CAQ.api = { ready, selectByCid, ensureSearchOpen, closeSearchPanel, exitIsolate };
})();

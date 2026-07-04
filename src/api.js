// api.js - integration layer with the Complete Anatomy web app.
// Drives the app's native "Search this model" panel to select a structure by cid,
// and blurs the app UI that would reveal the structure's name (breadcrumb + info card).
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

  // The search drawer (left panel with the input + results). We hide it while a
  // quiz runs so the user never sees the query being typed or the result names.
  // Hidden via opacity/pointer-events (caq-hide) — the extension still drives it
  // programmatically (setting the value and .click() work on invisible elements).
  function searchPanel() {
    const input = searchInput();
    if (!input) return null;
    let el = input;
    for (let i = 0; i < 10 && el && el !== document.body; i++) {
      el = el.parentElement;
      const r = el.getBoundingClientRect();
      if (r.left < 50 && r.width > 280 && r.width < 780 && r.height > 380) return el;
    }
    return null;
  }
  function hideSearchPanel() {
    const p = searchPanel();
    if (p) p.classList.add('caq-hide');
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
    // Hide the info card outright while we drive the (re)selection, so the name
    // never flashes readable mid-render. Once the selection settles we reveal the
    // card again with only its name blurred.
    cardSuppressed = true;
    await resetModel();
    if (!(await ensureSearchOpen())) return false;
    hideSearchPanel();
    const input = searchInput();
    nativeSetValue.call(input, name);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    let row = null;
    for (let i = 0; i < 30; i++) {
      await sleep(120);
      hideSearchPanel();
      row = document.querySelector(`li[data-testid="structure-item-${cid}"]`);
      if (row) break;
    }
    if (!row) return false;
    (row.querySelector('button') || row).click();
    await sleep(450);
    // Close the (already hidden) search so the selection info card renders — the
    // card holds the "Fade others" control and does not appear while search is open.
    closeSearchPanel();
    await sleep(300);
    CAQ.hideSpoilers();     // hide the name card immediately once it appears
    await fadeOthers();     // still works: .click() operates on the hidden card
    CAQ.hideSpoilers();     // re-hide (the card's menu changed while fading)
    cardSuppressed = false; // selection settled → reveal the card (name stays blurred)
    tagSpoilers();
    return true;
  }

  // --- Spoiler hiding ------------------------------------------------------
  // The app shows the selected structure's name in a breadcrumb <nav> and in a
  // top-left info card (the one carrying HIDE / FADE / Isolate). While a quiz
  // runs we keep the card VISIBLE so its controls stay usable, and only BLUR the
  // name heading and the breadcrumbs. The whole card is hidden only transiently,
  // while the extension is (re)selecting a structure (cardSuppressed), so the
  // name never flashes readable mid-render. A MutationObserver re-applies this
  // across the app's re-renders.
  let observer = null;
  let cardSuppressed = false; // true → hide the whole info card during a selection

  // The top-left selection card reveals the structure name via its heading.
  function nameHeading() {
    return [...document.querySelectorAll('h2')].find((h) => {
      const t = (h.textContent || '').trim();
      if (!t || /Cookie|Preference/i.test(t)) return false;
      const r = h.getBoundingClientRect();
      return r.left < 320 && r.top > 80 && r.top < 280;
    });
  }

  // Walk up from the name heading to the full card panel — the one that also
  // holds the HIDE / Isolate controls.
  function cardPanel(nameH2) {
    let card = nameH2;
    for (let i = 0; i < 10 && card && card !== document.body; i++) {
      card = card.parentElement;
      const r = card.getBoundingClientRect();
      const t = card.textContent || '';
      if (r.left < 40 && r.width > 140 && r.width < 380 && /HIDE/.test(t) && /Isolate/.test(t)) return card;
    }
    return null;
  }

  function tagSpoilers() {
    const nameH2 = nameHeading();
    if (nameH2) {
      nameH2.classList.add('caq-blur'); // blur just the name, leave the card in place
      const card = cardPanel(nameH2);
      // Fully hidden only while (re)selecting; otherwise visible with the name blurred.
      if (card) card.classList.toggle('caq-hide', cardSuppressed);
    }
    // Keep the search drawer fully hidden if it is open.
    hideSearchPanel();
  }

  CAQ.hideSpoilers = function () {
    document.documentElement.classList.add('caq-quiz-active');
    tagSpoilers();
  };

  CAQ.showSpoilers = function () {
    document.documentElement.classList.remove('caq-quiz-active');
    cardSuppressed = false;
    document.querySelectorAll('.caq-hide').forEach((e) => e.classList.remove('caq-hide'));
    document.querySelectorAll('.caq-blur').forEach((e) => e.classList.remove('caq-blur'));
  };

  CAQ.startSpoilerWatch = function () {
    if (observer) return;
    // Re-hide spoilers (name card + search drawer) on DOM changes, batched to one
    // pass per animation frame (runs before paint, so nothing flashes into view).
    let scheduled = false;
    observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        if (document.documentElement.classList.contains('caq-quiz-active')) tagSpoilers();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  CAQ.stopSpoilerWatch = function () {
    if (observer) { observer.disconnect(); observer = null; }
  };

  CAQ.api = { ready, selectByCid, ensureSearchOpen, closeSearchPanel, resetModel };
})();

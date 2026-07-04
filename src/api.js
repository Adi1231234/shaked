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
    revealedThisQuestion = false; // fresh question — answer is hidden again
    // Drop any manual reveals from the previous structure so they don't carry over.
    document.querySelectorAll('.caq-reveal').forEach((e) => e.classList.remove('caq-reveal'));
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
    // Remember this organ's heading so we only blur while IT is the one on screen.
    const h = nameHeading();
    currentSpoilerName = (h && h.textContent.trim()) || name;
    lastName = currentSpoilerName;
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
  let cardSuppressed = false;      // true → hide the whole info card during a selection
  let currentSpoilerName = null;   // card heading of the organ under quiz right now
  let revealedThisQuestion = false;// learner has revealed this question's answer
  let lastName = null;             // last displayed heading, to detect structure changes
  let lastShown = null;            // last "is the quiz organ on screen" value, for the hook

  // Stable app hooks (data-e2e) for the selection card, resilient to re-layout:
  //   heading  = the English primary name       (the main spoiler)
  //   nameWrap = wrapper holding name + Latin subtitle (blur target, no controls)
  //   card     = the whole infobox panel        (hidden only while (re)selecting)
  const nameHeading = () => document.querySelector('h2[data-e2e="StructureClusterNames_PrimaryName"]');
  const nameWrap = () => document.querySelector('[data-e2e="StructureClusterNames_Names"]');
  const cardPanel = () => document.querySelector('[data-e2e="InfoboxPanel_Component"]');
  // The breadcrumb trail lives inside a <nav>; identify it by its trail elements.
  const breadcrumbNavs = () =>
    [...document.querySelectorAll('nav')].filter((n) => n.querySelector('[data-e2e^="BreadcrumbTrail"]'));

  // The name of the structure currently shown in the card (what the learner sees).
  function shownName() {
    const h = nameHeading();
    return h ? h.textContent.trim() : null;
  }

  // Blur the breadcrumbs + card name ONLY while the CURRENT quiz organ is the one on
  // screen and its answer hasn't been revealed. If the learner clicks a different
  // structure, its name isn't a spoiler, so leave it readable; coming back to the
  // quiz organ re-blurs. While (re)selecting (cardSuppressed) we always blur, so the
  // name never flashes mid-transition.
  function tagSpoilers() {
    const curName = shownName();
    if (curName !== lastName) {
      // The displayed structure changed → drop stale per-structure manual reveals.
      document.querySelectorAll('.caq-reveal').forEach((e) => e.classList.remove('caq-reveal'));
      lastName = curName;
    }
    const showingQuizOrgan = !!(curName && curName === currentSpoilerName);
    const blurIt = cardSuppressed || (showingQuizOrgan && !revealedThisQuestion);
    const wrap = nameWrap();
    if (wrap) wrap.classList.toggle('caq-blur', blurIt); // name + Latin subtitle
    const card = cardPanel();
    if (card) card.classList.toggle('caq-hide', cardSuppressed);
    // Breadcrumbs mirror the selected structure — blur them under the same condition.
    breadcrumbNavs().forEach((n) => n.classList.toggle('caq-blur', blurIt));
    // Notify listeners (the re-select button) when the quiz organ's visibility flips.
    if (showingQuizOrgan !== lastShown) {
      lastShown = showingQuizOrgan;
      if (CAQ.onQuizOrganShown) CAQ.onQuizOrganShown(showingQuizOrgan);
    }
    // Keep the search drawer fully hidden if it is open.
    hideSearchPanel();
  }

  // Is the organ under quiz the one currently selected/shown on the model?
  CAQ.isQuizOrganShown = function () {
    const n = shownName();
    return !!(n && n === currentSpoilerName);
  };

  // Clicking a blurred app spoiler (breadcrumbs, or the card's name/subtitle) asks
  // before revealing it, so an accidental click can't spoil the answer. Our own
  // quiz UI (.caq-root) is exempt — its answer box reveals directly on click.
  function onSpoilerClick(e) {
    if (!document.documentElement.classList.contains('caq-quiz-active')) return;
    if (e.target.closest('.caq-root')) return;
    // Only currently-blurred spoilers prompt; a readable (non-quiz) structure doesn't.
    const el = e.target.closest('.caq-blur');
    if (!el || el.classList.contains('caq-reveal')) return;
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('לחשוף את הטקסט?')) el.classList.add('caq-reveal');
  }

  CAQ.hideSpoilers = function () {
    document.documentElement.classList.add('caq-quiz-active');
    tagSpoilers();
  };

  CAQ.showSpoilers = function () {
    document.documentElement.classList.remove('caq-quiz-active');
    cardSuppressed = false;
    currentSpoilerName = null;
    revealedThisQuestion = false;
    lastName = null;
    lastShown = null;
    document.querySelectorAll('.caq-hide').forEach((e) => e.classList.remove('caq-hide'));
    document.querySelectorAll('.caq-blur').forEach((e) => e.classList.remove('caq-blur'));
    document.querySelectorAll('.caq-reveal').forEach((e) => e.classList.remove('caq-reveal'));
  };

  // Reveal every blurred spoiler at once (name, subtitle, breadcrumbs). Called when
  // the learner reveals the answer — once the answer is out, hiding the rest is moot.
  // This holds for the rest of the question even if they revisit the organ.
  CAQ.revealAllSpoilers = function () {
    revealedThisQuestion = true;
    tagSpoilers();
  };

  CAQ.startSpoilerWatch = function () {
    if (observer) return;
    document.addEventListener('click', onSpoilerClick, true);
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
    document.removeEventListener('click', onSpoilerClick, true);
    if (observer) { observer.disconnect(); observer = null; }
  };

  CAQ.api = { ready, selectByCid, ensureSearchOpen, closeSearchPanel, resetModel };
})();

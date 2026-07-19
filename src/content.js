// content.js - bootstrap: wait for the app, load data, wire launcher -> setup -> quiz.
(function () {
  const CAQ = window.CAQ;
  let modalEl = null;
  let activeAreaId = null;
  // Per-area metadata (term counts) for the modal subtitle, keyed by area id.
  const areaMeta = {};

  // The built-in study areas (tabs). Both use the SAME Head & Neck model, so the
  // quiz never switches models - areas are only a grouping of content.
  const AREAS = [
    { id: 'brain', label: 'מוח', file: 'src/structures.json' },
    { id: 'headneck', label: 'ראש צוואר', file: 'src/structures-headneck.json' },
  ];

  async function loadArea(a) {
    const url = chrome.runtime.getURL(a.file);
    return await (await fetch(url)).json();
  }

  function closeModal() {
    if (modalEl) { modalEl.remove(); modalEl = null; }
  }

  function startQuiz(items) {
    closeModal();
    if (!items || !items.length) return;
    const quiz = new CAQ.Quiz(items);
    CAQ.quizUI.run(quiz, () => {});
  }

  // List + area management from the setup modal. Each re-renders so the change shows.
  const actions = {
    rename: (g, label) => { CAQ.lists.rename(g.id, label); openSetup(); },
    // Custom lists are removed whole; built-in lists are hidden (base is bundled).
    remove: (g) => { g.custom ? CAQ.lists.remove(g.id) : CAQ.lists.hide(g.id); openSetup(); },
    clearAdditions: (g) => { CAQ.lists.clearAdditions(g.id); openSetup(); },
    restore: (id) => { CAQ.lists.show(id); openSetup(); },
    switchArea: (id) => { activeAreaId = id; openSetup(); },
    addArea: (label) => { const a = CAQ.lists.addArea(label); activeAreaId = a.id; openSetup(); },
    renameArea: (id, label) => { CAQ.lists.renameArea(id, label); openSetup(); },
    removeArea: (id) => { CAQ.lists.removeArea(id); activeAreaId = null; openSetup(); },
    // Import a matched word list into the active area as a new custom list.
    importList: (label, items) => {
      const l = CAQ.lists.create(label, activeAreaId);
      items.forEach((it) => CAQ.lists.addItem(l.id, it));
      openSetup();
    },
  };

  async function openSetup() {
    const areas = CAQ.lists.areaList();
    if (!areas.length) return;
    if (!areas.some((a) => a.id === activeAreaId)) activeAreaId = areas[0].id;
    // Built-in dissection groups (with additions) + custom lists of the active area.
    const groups = CAQ.lists.targets(activeAreaId).map((t) => (
      { id: t.id, label: (t.builtin ? '' : '★ ') + t.label, rawLabel: t.label, items: t.items, custom: !t.builtin, added: t.added }));
    const hidden = CAQ.lists.hiddenBuiltins(activeAreaId);
    const excluded = CAQ.lists.excludedOf(activeAreaId);
    const area = areas.find((a) => a.id === activeAreaId);
    const data = { ...(areaMeta[activeAreaId] || {}), groups, hidden, excluded, areas, activeAreaId, areaLabel: area.label, areaBuiltin: area.builtin };
    const progress = CAQ.store ? await CAQ.store.load() : {};
    closeModal();
    modalEl = CAQ.setup.openModal(data, progress, startQuiz, closeModal, actions);
  }

  async function init() {
    if (!(await CAQ.api.ready())) return;
    if (CAQ.lists) await CAQ.lists.init();
    for (const a of AREAS) {
      const d = await loadArea(a);
      // uniqueStructures may be absent in the JSON; derive it from the actual cids so
      // the subtitle's "N מבנים ייחודיים" matches how the quiz dedupes.
      const uniq = d.uniqueStructures || new Set(d.groups.flatMap((g) => g.items.map((it) => it.cid))).size;
      areaMeta[a.id] = { totalTerms: d.totalTerms, presentTerms: d.presentTerms, uniqueStructures: uniq };
      if (CAQ.lists) CAQ.lists.registerArea(a.id, a.label, d.groups, d.excluded);
    }
    CAQ.setup.mountLauncher(openSetup);
    if (CAQ.searchAdd) CAQ.searchAdd.start();
  }

  init();
})();

// content.js - bootstrap: wait for the app, load data, wire launcher -> setup -> quiz.
(function () {
  const CAQ = window.CAQ;
  let structures = null;
  let modalEl = null;

  async function loadStructures() {
    if (structures) return structures;
    const url = chrome.runtime.getURL('src/structures.json');
    structures = await (await fetch(url)).json();
    return structures;
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

  function deleteList(id) {
    if (CAQ.lists) CAQ.lists.remove(id);
    openSetup(); // re-render so the removed list disappears
  }

  async function openSetup() {
    const base = await loadStructures();
    // Built-in dissection lists (with your additions) + custom lists, as quizzable groups.
    const groups = CAQ.lists
      ? CAQ.lists.targets().map((t) => (
        { id: t.id, label: (t.builtin ? '' : '★ ') + t.label, items: t.items, custom: !t.builtin }))
      : base.groups;
    const data = { ...base, groups };
    const progress = CAQ.store ? await CAQ.store.load() : {};
    closeModal();
    modalEl = CAQ.setup.openModal(data, progress, startQuiz, closeModal, deleteList);
  }

  async function init() {
    if (!(await CAQ.api.ready())) return;
    const base = await loadStructures();
    if (CAQ.lists) { await CAQ.lists.init(); CAQ.lists.setBuiltins(base.groups); }
    CAQ.setup.mountLauncher(openSetup);
    if (CAQ.searchAdd) CAQ.searchAdd.start();
  }

  init();
})();

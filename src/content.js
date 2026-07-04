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
    // Merge the user's custom lists in as extra (quizzable) groups.
    const custom = (CAQ.lists ? CAQ.lists.all() : []).map((l) => (
      { id: l.id, label: '★ ' + l.label, items: l.items, custom: true }));
    const data = { ...base, groups: [...base.groups, ...custom] };
    const progress = CAQ.store ? await CAQ.store.load() : {};
    closeModal();
    modalEl = CAQ.setup.openModal(data, progress, startQuiz, closeModal, deleteList);
  }

  async function init() {
    if (!(await CAQ.api.ready())) return;
    if (CAQ.lists) await CAQ.lists.init();
    await loadStructures();
    CAQ.setup.mountLauncher(openSetup);
    if (CAQ.searchAdd) CAQ.searchAdd.start();
  }

  init();
})();

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

  async function openSetup() {
    const data = await loadStructures();
    const progress = CAQ.store ? await CAQ.store.load() : {};
    closeModal();
    modalEl = CAQ.setup.openModal(data, progress, startQuiz, closeModal);
  }

  async function init() {
    if (!(await CAQ.api.ready())) return;
    await loadStructures();
    CAQ.setup.mountLauncher(openSetup);
  }

  init();
})();

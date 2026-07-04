// ui-setup.js - the launcher button + entry point to the setup modal.
(function () {
  const CAQ = (window.CAQ = window.CAQ || {});
  const BRAIN_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 4a2.5 2.5 0 0 0-2.4 3.2A2.5 2.5 0 0 0 5 12a2.5 2.5 0 0 0 2 4 2.5 2.5 0 0 0 5 .5V4.5A2.5 2.5 0 0 0 9.5 4Z"/><path d="M14.5 4A2.5 2.5 0 0 1 17 6.5 2.5 2.5 0 0 1 19 11a2.5 2.5 0 0 1-1 4.5"/></svg>';

  function launcher(onOpen) {
    const b = document.createElement('div');
    b.className = 'caq-root caq-launch';
    b.innerHTML = BRAIN_SVG + '<span>בחן אותי</span>';
    b.title = 'תרגול עצמי על המודל';
    b.addEventListener('click', onOpen);
    return b;
  }

  CAQ.setup = {
    mountLauncher(onOpen) { document.body.appendChild(launcher(onOpen)); },
    openModal(structures, progress, onStart, onClose, onDeleteList) {
      const el = CAQ._buildSetupModal(structures, progress || {}, onStart, onClose, onDeleteList);
      document.body.appendChild(el);
      return el;
    },
  };
})();

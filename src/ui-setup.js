// ui-setup.js - launcher button + setup modal (choose "all" or a custom subset).
(function () {
  const CAQ = (window.CAQ = window.CAQ || {});
  const h = (tag, cls, txt) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (txt != null) el.textContent = txt;
    return el;
  };
  const BRAIN_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 4a2.5 2.5 0 0 0-2.4 3.2A2.5 2.5 0 0 0 5 12a2.5 2.5 0 0 0 2 4 2.5 2.5 0 0 0 5 .5V4.5A2.5 2.5 0 0 0 9.5 4Z"/><path d="M14.5 4A2.5 2.5 0 0 1 17 6.5 2.5 2.5 0 0 1 19 11a2.5 2.5 0 0 1-1 4.5"/></svg>';

  function launcher(onOpen) {
    const b = h('div', 'caq-root caq-launch');
    b.innerHTML = BRAIN_SVG + '<span>בחן אותי</span>';
    b.title = 'תרגול עצמי על המודל';
    b.addEventListener('click', onOpen);
    return b;
  }

  function buildModal(structures, onStart, onClose) {
    const overlay = h('div', 'caq-root caq-overlay');
    const modal = h('div', 'caq-modal');
    overlay.appendChild(modal);

    const head = h('div', 'caq-modal__head');
    head.appendChild(h('h2', 'caq-modal__title', 'מבחן אנטומיה - מוח'));
    const excl = structures.excluded ? structures.excluded.length : 0;
    const uniq = structures.uniqueStructures || structures.presentTerms;
    head.appendChild(h('p', 'caq-modal__sub',
      `מתוך ${structures.totalTerms} האיברים ברשימה, ${structures.presentTerms} קיימים במודל וזמינים לתרגול ` +
      `(${uniq} מבנים ייחודיים - המבחן לא חוזר על אותו מבנה). ` +
      `${excl} האחרים אינם מסומנים במודל הזה.`));
    modal.appendChild(head);

    const tabs = h('div', 'caq-tabs');
    const tabAll = h('div', 'caq-tab caq-tab--active', 'כל האיברים');
    const tabPick = h('div', 'caq-tab', 'בחירת איברים');
    tabs.appendChild(tabAll); tabs.appendChild(tabPick);
    modal.appendChild(tabs);

    const body = h('div', 'caq-modal__body');
    modal.appendChild(body);
    const allNote = h('p', 'caq-modal__sub',
      `המבחן יכלול את כל ${structures.presentTerms} האיברים הזמינים, בסדר אקראי וללא חזרות.`);
    const pickWrap = h('div');
    pickWrap.style.display = 'none';
    body.appendChild(allNote);
    body.appendChild(pickWrap);

    const boxes = [];
    structures.groups.forEach((g) => {
      if (!g.items.length) return;
      const grp = h('div', 'caq-group');
      const gh = h('div', 'caq-group__head');
      gh.appendChild(h('div', 'caq-group__title', g.label));
      const toggle = h('button', 'caq-linkbtn', 'בחר הכל');
      gh.appendChild(toggle);
      grp.appendChild(gh);
      const items = h('div', 'caq-items');
      const groupBoxes = [];
      g.items.forEach((it) => {
        const label = h('label', 'caq-item');
        const cb = h('input');
        cb.type = 'checkbox'; cb.checked = true; cb._item = it;
        label.appendChild(cb);
        label.appendChild(h('span', null, it.term));
        items.appendChild(label);
        boxes.push(cb); groupBoxes.push(cb);
      });
      toggle.addEventListener('click', () => {
        const anyOff = groupBoxes.some((c) => !c.checked);
        groupBoxes.forEach((c) => (c.checked = anyOff));
        toggle.textContent = anyOff ? 'נקה הכל' : 'בחר הכל';
        updateCount();
      });
      grp.appendChild(items);
      pickWrap.appendChild(grp);
    });

    const foot = h('div', 'caq-modal__foot');
    const left = h('div');
    const count = h('span', 'caq-selcount', '');
    left.appendChild(count);
    const right = h('div');
    const cancel = h('button', 'caq-btn caq-btn--ghost', 'ביטול');
    const start = h('button', 'caq-btn', 'התחל מבחן');
    right.appendChild(cancel); right.appendChild(start);
    right.style.display = 'flex'; right.style.gap = '10px';
    foot.appendChild(left); foot.appendChild(right);
    modal.appendChild(foot);

    let mode = 'all';
    function selectedItems() {
      return mode === 'all'
        ? structures.groups.flatMap((g) => g.items)
        : boxes.filter((c) => c.checked).map((c) => c._item);
    }
    function updateCount() {
      const n = new Set(selectedItems().map((it) => it.cid)).size;
      count.textContent = `${n} איברים נבחרו`;
      start.disabled = n === 0;
    }
    function setMode(m) {
      mode = m;
      tabAll.classList.toggle('caq-tab--active', m === 'all');
      tabPick.classList.toggle('caq-tab--active', m === 'pick');
      allNote.style.display = m === 'all' ? '' : 'none';
      pickWrap.style.display = m === 'pick' ? '' : 'none';
      updateCount();
    }
    tabAll.addEventListener('click', () => setMode('all'));
    tabPick.addEventListener('click', () => setMode('pick'));
    boxes.forEach((c) => c.addEventListener('change', updateCount));
    cancel.addEventListener('click', onClose);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) onClose(); });
    start.addEventListener('click', () => onStart(selectedItems()));
    setMode('all');
    return overlay;
  }

  CAQ.setup = {
    mountLauncher(onOpen) { document.body.appendChild(launcher(onOpen)); },
    openModal(structures, onStart, onClose) {
      const el = buildModal(structures, onStart, onClose);
      document.body.appendChild(el);
      return el;
    },
  };
})();

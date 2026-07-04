// ui-modal.js - the setup modal shell: tabs, saved-progress filter, and wiring.
(function () {
  const CAQ = (window.CAQ = window.CAQ || {});
  const h = (tag, cls, txt) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (txt != null) el.textContent = txt;
    return el;
  };
  const STATUSES = [
    { key: 'known', label: 'זכרתי' },
    { key: 'unknown', label: 'לא זכרתי' },
    { key: 'unmarked', label: 'לא סומן' },
  ];

  CAQ._buildSetupModal = function (structures, progress, onStart, onClose) {
    const allItems = structures.groups.flatMap((g) => g.items);
    const statusOf = (it) => progress[it.cid] || 'unmarked';
    const active = new Set(STATUSES.map((s) => s.key));

    const overlay = h('div', 'caq-root caq-overlay');
    const modal = h('div', 'caq-modal');
    overlay.appendChild(modal);

    const head = h('div', 'caq-modal__head');
    head.appendChild(h('h2', 'caq-modal__title', 'מבחן אנטומיה - מוח'));
    const excl = structures.excluded ? structures.excluded.length : 0;
    const uniq = structures.uniqueStructures || structures.presentTerms;
    head.appendChild(h('p', 'caq-modal__sub',
      `מתוך ${structures.totalTerms} האיברים ברשימה, ${structures.presentTerms} קיימים במודל וזמינים לתרגול ` +
      `(${uniq} מבנים ייחודיים - המבחן לא חוזר על אותו מבנה). ${excl} האחרים אינם מסומנים במודל הזה.`));
    modal.appendChild(head);

    const tabs = h('div', 'caq-tabs');
    const tabAll = h('div', 'caq-tab caq-tab--active', 'כל האיברים');
    const tabPick = h('div', 'caq-tab', 'בחירת איברים');
    tabs.appendChild(tabAll); tabs.appendChild(tabPick);
    modal.appendChild(tabs);

    const filterRow = h('div', 'caq-filter');
    filterRow.appendChild(h('span', 'caq-filter__label', 'הצג:'));
    const chips = {};
    STATUSES.forEach((s) => {
      const chip = h('button', `caq-chip caq-chip--on caq-chip--${s.key}`, s.label);
      chip.addEventListener('click', () => {
        active.has(s.key) ? active.delete(s.key) : active.add(s.key);
        if (!active.size) active.add(s.key);
        chip.classList.toggle('caq-chip--on', active.has(s.key));
        updateCount();
      });
      chips[s.key] = chip;
      filterRow.appendChild(chip);
    });
    modal.appendChild(filterRow);

    const body = h('div', 'caq-modal__body');
    modal.appendChild(body);
    const allNote = h('p', 'caq-modal__sub',
      'המבחן יכלול את כל האיברים שתואמים לפילטר שלמעלה, בסדר אקראי וללא חזרות.');
    const list = CAQ._buildPickList(structures, statusOf, updateCount);
    list.el.style.display = 'none';
    body.appendChild(allNote);
    body.appendChild(list.el);

    const foot = h('div', 'caq-modal__foot');
    const left = h('div', 'caq-modal__footleft');
    const count = h('span', 'caq-selcount', '');
    const reset = h('button', 'caq-linkbtn caq-reset', 'אפס התקדמות');
    left.appendChild(count); left.appendChild(reset);
    const right = h('div', 'caq-modal__footright');
    const cancel = h('button', 'caq-btn caq-btn--ghost', 'ביטול');
    const start = h('button', 'caq-btn', 'התחל מבחן');
    right.appendChild(cancel); right.appendChild(start);
    foot.appendChild(left); foot.appendChild(right);
    modal.appendChild(foot);

    let mode = 'all';
    const selectedItems = () => (mode === 'all'
      ? allItems : list.boxes.filter((c) => c.checked).map((c) => c._item))
      .filter((it) => active.has(statusOf(it)));
    function statusCounts() {
      const seen = new Set(); const c = { known: 0, unknown: 0, unmarked: 0 };
      allItems.forEach((it) => { if (seen.has(it.cid)) return; seen.add(it.cid); c[statusOf(it)]++; });
      return c;
    }
    function updateCount() {
      list.applyFilter(active);
      const n = new Set(selectedItems().map((it) => it.cid)).size;
      count.textContent = `${n} איברים במבחן`;
      start.disabled = n === 0;
      const cs = statusCounts();
      STATUSES.forEach((s) => { chips[s.key].textContent = `${s.label} · ${cs[s.key]}`; });
    }
    function setMode(m) {
      mode = m;
      tabAll.classList.toggle('caq-tab--active', m === 'all');
      tabPick.classList.toggle('caq-tab--active', m === 'pick');
      allNote.style.display = m === 'all' ? '' : 'none';
      list.el.style.display = m === 'pick' ? '' : 'none';
      updateCount();
    }
    tabAll.addEventListener('click', () => setMode('all'));
    tabPick.addEventListener('click', () => setMode('pick'));
    reset.addEventListener('click', () => {
      if (CAQ.store) CAQ.store.clear();
      Object.keys(progress).forEach((k) => delete progress[k]);
      list.dotEls.forEach((dot) => (dot.className = 'caq-dot caq-dot--unmarked'));
      updateCount();
    });
    cancel.addEventListener('click', onClose);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) onClose(); });
    start.addEventListener('click', () => onStart(selectedItems()));
    setMode('all');
    return overlay;
  };
})();

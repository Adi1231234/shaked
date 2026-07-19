// ui-modal.js - the setup modal shell: area tabs, all/pick mode, saved-progress
// filter, excluded section, and wiring. One area's content is shown at a time;
// switching areas re-opens the modal (content.js) scoped to the chosen area.
(function () {
  const CAQ = (window.CAQ = window.CAQ || {});
  const h = (tag, cls, txt) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (txt != null) el.textContent = txt;
    return el;
  };
  const STATUSES = CAQ._STATUSES;

  CAQ._buildSetupModal = function (structures, progress, onStart, onClose, actions) {
    actions = actions || {};
    const allItems = structures.groups.flatMap((g) => g.items);
    const statusOf = (it) => progress[it.cid] || 'unmarked';
    const active = new Set(STATUSES.map((s) => s.key));

    const overlay = h('div', 'caq-root caq-overlay');
    const modal = h('div', 'caq-modal');
    overlay.appendChild(modal);

    // Study-area tab strip (מוח / ראש צוואר / user areas).
    if (structures.areas && CAQ._buildAreaBar) modal.appendChild(CAQ._buildAreaBar(structures.areas, structures.activeAreaId, actions));

    const head = h('div', 'caq-modal__head');
    head.appendChild(h('h2', 'caq-modal__title', 'מבחן אנטומיה - ' + (structures.areaLabel || '')));
    head.appendChild(h('p', 'caq-modal__sub', CAQ._areaSubtitle(structures)));
    modal.appendChild(head);

    const tabs = h('div', 'caq-tabs');
    const tabAll = h('div', 'caq-tab caq-tab--active', 'כל האיברים');
    const tabPick = h('div', 'caq-tab', 'בחירת איברים');
    tabs.appendChild(tabAll); tabs.appendChild(tabPick);
    modal.appendChild(tabs);

    const filter = CAQ._buildFilterRow(active, () => updateCount());
    const chips = filter.chips;
    const hint = filter.hint;
    // Low-emphasis list utilities belong with the status row, not the terminal
    // action bar: bulk select/clear (pick mode only) + reset progress. They sit at
    // the end of the chips line (before the full-width hint).
    const tools = h('div', 'caq-filter__tools');
    const selAll = h('button', 'caq-toolbtn caq-selall', 'נקה הכל');
    const reset = h('button', 'caq-toolbtn caq-reset', '↺ אפס התקדמות');
    tools.appendChild(selAll); tools.appendChild(reset);
    filter.el.insertBefore(tools, hint);
    modal.appendChild(filter.el);

    const body = h('div', 'caq-modal__body');
    modal.appendChild(body);
    const allNote = h('p', 'caq-modal__sub',
      'המבחן יכלול את כל האיברים שתואמים לפילטר שלמעלה, בסדר אקראי וללא חזרות.');
    const list = CAQ._buildPickList(structures, statusOf, updateCount, cycleStatus, actions);
    list.el.style.display = 'none';
    body.appendChild(allNote);
    if (!allItems.length) body.appendChild(h('p', 'caq-modal__sub', 'האזור הזה עדיין ריק. ייבאי רשימת מונחים או הוסיפי מבנים מהחיפוש של האפליקציה.'));
    body.appendChild(list.el);
    if (CAQ._buildExcluded) body.appendChild(CAQ._buildExcluded(structures.excluded));

    // Terminal action bar: just the count (status) and the dialog actions, so the
    // primary is unmistakable. Content utilities live in the area bar / status row.
    const foot = h('div', 'caq-modal__foot');
    const left = h('div', 'caq-modal__footleft');
    const count = h('span', 'caq-selcount', '');
    left.appendChild(count);
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
    const ORDER = ['unmarked', 'known', 'unknown'];
    function cycleStatus(it) {
      const next = ORDER[(ORDER.indexOf(statusOf(it)) + 1) % ORDER.length];
      if (next === 'unmarked') delete progress[it.cid];
      else progress[it.cid] = next;
      if (CAQ.store) CAQ.store.set(it.cid, next === 'unmarked' ? null : next);
      list.repaintDots();
      updateCount();
    }
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
      if (mode === 'pick') {
        const vis = list.visibleBoxes();
        const allOn = vis.length > 0 && vis.every((cb) => cb.checked);
        selAll.textContent = allOn ? 'נקה הכל' : 'בחר הכל';
      }
    }
    function setMode(m) {
      mode = m;
      tabAll.classList.toggle('caq-tab--active', m === 'all');
      tabPick.classList.toggle('caq-tab--active', m === 'pick');
      allNote.style.display = m === 'all' ? '' : 'none';
      hint.style.display = m === 'pick' ? '' : 'none';
      list.el.style.display = m === 'pick' ? '' : 'none';
      selAll.style.display = m === 'pick' ? '' : 'none'; // clearing only applies to picking
      updateCount();
    }
    tabAll.addEventListener('click', () => setMode('all'));
    tabPick.addEventListener('click', () => setMode('pick'));
    selAll.addEventListener('click', () => {
      const vis = list.visibleBoxes();
      const anyOff = vis.some((cb) => !cb.checked);
      vis.forEach((cb) => (cb.checked = anyOff)); // all-on → clear; otherwise select all
      updateCount();
    });
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

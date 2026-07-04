// ui-list.js - the grouped, filterable checkbox list shown inside the setup modal.
(function () {
  const CAQ = (window.CAQ = window.CAQ || {});
  const h = (tag, cls, txt) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (txt != null) el.textContent = txt;
    return el;
  };

  // statusOf(it) -> 'known' | 'unknown' | 'unmarked'; onChange fires on any toggle;
  // onCycle(it) is called when a status dot is clicked (to advance its status).
  CAQ._buildPickList = function (structures, statusOf, onChange, onCycle) {
    const wrap = h('div');
    const boxes = [];
    const dotEls = [];
    const groups = [];

    structures.groups.forEach((g) => {
      if (!g.items.length) return;
      const grp = h('div', 'caq-group');
      const gh = h('div', 'caq-group__head');
      gh.appendChild(h('div', 'caq-group__title', g.label));
      const toggle = h('button', 'caq-linkbtn', 'נקה הכל');
      gh.appendChild(toggle);
      grp.appendChild(gh);
      const items = h('div', 'caq-items');
      const rows = [];
      g.items.forEach((it) => {
        const label = h('label', 'caq-item');
        const cb = h('input');
        cb.type = 'checkbox'; cb.checked = true; cb._item = it;
        const dot = h('button', `caq-dot caq-dot--${statusOf(it)}`);
        dot.type = 'button'; dot._item = it;
        dot.title = 'שינוי סטטוס: לא סומן ← זכרתי ← לא זכרתי';
        dot.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onCycle(it); });
        label.appendChild(cb);
        label.appendChild(dot);
        label.appendChild(h('span', 'caq-item__term', it.term));
        items.appendChild(label);
        boxes.push(cb); dotEls.push(dot);
        rows.push({ cb, label, it });
      });
      toggle.addEventListener('click', () => {
        const shown = rows.filter((r) => r.label.style.display !== 'none');
        const anyOff = shown.some((r) => !r.cb.checked);
        shown.forEach((r) => (r.cb.checked = anyOff));
        toggle.textContent = anyOff ? 'נקה הכל' : 'בחר הכל';
        onChange();
      });
      grp.appendChild(items);
      wrap.appendChild(grp);
      groups.push({ grp, rows });
    });

    boxes.forEach((c) => c.addEventListener('change', onChange));

    // Hide rows whose saved status is not in the active set; hide emptied groups.
    function applyFilter(active) {
      groups.forEach(({ grp, rows }) => {
        let visible = 0;
        rows.forEach((r) => {
          const show = active.has(statusOf(r.it));
          r.label.style.display = show ? '' : 'none';
          if (show) visible++;
        });
        grp.style.display = visible ? '' : 'none';
      });
    }

    // Re-colour every dot from the current saved status (after a status change).
    function repaintDots() {
      dotEls.forEach((d) => (d.className = `caq-dot caq-dot--${statusOf(d._item)}`));
    }

    return { el: wrap, boxes, dotEls, applyFilter, repaintDots };
  };
})();

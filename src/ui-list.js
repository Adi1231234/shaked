// ui-list.js - the grouped, filterable checkbox list shown inside the setup modal.
(function () {
  const CAQ = (window.CAQ = window.CAQ || {});
  const h = (tag, cls, txt) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (txt != null) el.textContent = txt;
    return el;
  };

  // statusOf(it)->status; onChange fires on toggle; onCycle(it) advances a status
  // dot; actions = { rename, remove, clearAdditions, restore } for list management.
  CAQ._buildPickList = function (structures, statusOf, onChange, onCycle, actions) {
    actions = actions || {};
    const wrap = h('div');
    const boxes = [];
    const dotEls = [];
    const groups = [];

    function renameInline(title, g) {
      const orig = g.rawLabel != null ? g.rawLabel : g.label;
      const inp = h('input', 'caq-group__rename');
      inp.value = orig;
      let done = false;
      const finish = (save) => {
        if (done) return; done = true;
        const v = inp.value.trim();
        inp.replaceWith(title);
        if (save && v && v !== orig && actions.rename) actions.rename(g, v);
      };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') finish(true); else if (e.key === 'Escape') finish(false); });
      inp.addEventListener('blur', () => finish(true));
      title.replaceWith(inp); inp.focus(); inp.select();
    }

    function header(g) {
      const gh = h('div', 'caq-group__head');
      const tw = h('div', 'caq-group__titlewrap');
      const title = h('div', 'caq-group__title', g.label);
      const pen = h('button', 'caq-group__icon', '✎'); pen.title = 'שנה שם';
      pen.addEventListener('click', () => renameInline(title, g));
      tw.appendChild(title); tw.appendChild(pen);
      const acts = h('div', 'caq-group__actions');
      if (actions.remove) {
        const del = h('button', 'caq-group__del', g.custom ? 'מחק' : 'הסתר');
        del.addEventListener('click', () => actions.remove(g));
        acts.appendChild(del);
      }
      if (!g.custom && g.added > 0 && actions.clearAdditions) {
        const c = h('button', 'caq-group__del', `נקה תוספות (${g.added})`);
        c.addEventListener('click', () => actions.clearAdditions(g));
        acts.appendChild(c);
      }
      const toggle = h('button', 'caq-linkbtn', 'נקה הכל');
      acts.appendChild(toggle);
      gh.appendChild(tw); gh.appendChild(acts);
      return { gh, toggle };
    }

    structures.groups.forEach((g) => {
      if (!g.items.length) return;
      const grp = h('div', 'caq-group');
      const { gh, toggle } = header(g);
      grp.appendChild(gh);
      const items = h('div', 'caq-items');
      const rows = [];
      g.items.forEach((it) => {
        const label = h('label', 'caq-item');
        const cb = h('input'); cb.type = 'checkbox'; cb.checked = true; cb._item = it;
        const dot = h('button', `caq-dot caq-dot--${statusOf(it)}`);
        dot.type = 'button'; dot._item = it;
        dot.title = 'שינוי סטטוס: לא סומן ← זכרתי ← לא זכרתי';
        dot.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onCycle(it); });
        label.appendChild(cb); label.appendChild(dot); label.appendChild(h('span', 'caq-item__term', it.term));
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

    if (structures.hidden && structures.hidden.length && actions.restore) {
      const hid = h('div', 'caq-hidden');
      hid.appendChild(h('span', 'caq-hidden__label', 'רשימות מוסתרות:'));
      structures.hidden.forEach((hL) => {
        const b = h('button', 'caq-linkbtn', `${hL.label} ↩`);
        b.addEventListener('click', () => actions.restore(hL.id));
        hid.appendChild(b);
      });
      wrap.appendChild(hid);
    }

    boxes.forEach((c) => c.addEventListener('change', onChange));

    function applyFilter(active) {
      groups.forEach(({ grp, rows }) => {
        let visible = 0;
        rows.forEach((r) => { const show = active.has(statusOf(r.it)); r.label.style.display = show ? '' : 'none'; if (show) visible++; });
        grp.style.display = visible ? '' : 'none';
      });
    }
    function repaintDots() { dotEls.forEach((d) => (d.className = `caq-dot caq-dot--${statusOf(d._item)}`)); }

    return { el: wrap, boxes, dotEls, applyFilter, repaintDots };
  };
})();

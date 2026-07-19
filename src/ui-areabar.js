// ui-areabar.js - the study-area tab strip at the top of the setup modal. Each
// area is a tab (built-in "מוח"/"ראש צוואר" or a user-created one); a ＋ button adds
// an empty area. The active area, if user-created, can be renamed or removed.
(function () {
  const CAQ = (window.CAQ = window.CAQ || {});
  const h = (tag, cls, txt) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (txt != null) el.textContent = txt;
    return el;
  };

  // areas = [{id,label,builtin}]; activeId; actions = {switchArea, addArea, renameArea, removeArea}.
  CAQ._buildAreaBar = function (areas, activeId, actions) {
    const bar = h('div', 'caq-areabar');
    const strip = h('div', 'caq-areatabs');
    let activeArea = null;

    areas.forEach((a) => {
      const on = a.id === activeId;
      if (on) activeArea = a;
      const tab = h('button', 'caq-areatab' + (on ? ' caq-areatab--active' : ''), a.label);
      if (!a.builtin) tab.title = 'אזור מותאם אישית';
      tab.addEventListener('click', () => { if (!on && actions.switchArea) actions.switchArea(a.id); });
      strip.appendChild(tab);
    });

    const add = h('button', 'caq-areatab caq-areatab--add', '＋ אזור');
    add.title = 'הוסף אזור לימוד חדש';
    add.addEventListener('click', () => {
      const name = (window.prompt('שם האזור החדש:', '') || '').trim();
      if (name && actions.addArea) actions.addArea(name);
    });
    strip.appendChild(add);

    // Import a word list into the active area (grouped with ＋אזור as the content
    // actions, so the modal footer stays a clean start/cancel bar).
    const imp = h('button', 'caq-areatab caq-areatab--import', '⬆ ייבוא רשימה');
    imp.title = 'הדביקי רשימת מונחים, נתאים כל אחד למבנה במודל ונוסיף אותם לאזור הפעיל';
    imp.addEventListener('click', () => {
      if (CAQ._openImport) CAQ._openImport(activeArea ? activeArea.label : '', (label, items) => actions.importList && actions.importList(label, items));
    });
    strip.appendChild(imp);
    bar.appendChild(strip);

    // Rename / delete controls, only for a user-created active area.
    if (activeArea && !activeArea.builtin) {
      const tools = h('div', 'caq-areatools');
      const ren = h('button', 'caq-linkbtn', 'שנה שם אזור');
      ren.addEventListener('click', () => {
        const name = (window.prompt('שם חדש לאזור:', activeArea.label) || '').trim();
        if (name && actions.renameArea) actions.renameArea(activeArea.id, name);
      });
      const del = h('button', 'caq-linkbtn caq-areatools__del', 'מחק אזור');
      del.addEventListener('click', () => {
        if (window.confirm(`למחוק את האזור "${activeArea.label}" ואת כל הרשימות שבו?`) && actions.removeArea) actions.removeArea(activeArea.id);
      });
      tools.appendChild(ren); tools.appendChild(del);
      bar.appendChild(tools);
    }

    return bar;
  };
})();

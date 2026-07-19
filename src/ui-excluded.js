// ui-excluded.js - a collapsible section listing the area's terms that were
// searched but aren't discrete, clickable structures in this model, so they can't
// be quizzed here. Collapsed by default; the header toggles it open.
(function () {
  const CAQ = (window.CAQ = window.CAQ || {});
  const h = (tag, cls, txt) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (txt != null) el.textContent = txt;
    return el;
  };

  // excluded = [{term, ...}] (brain: {group,term}; head-neck also has {cat,closest}).
  CAQ._buildExcluded = function (excluded) {
    if (!excluded || !excluded.length) return document.createComment('no-excluded');
    const wrap = h('div', 'caq-excl');
    const head = h('button', 'caq-excl__head');
    const caret = h('span', 'caq-excl__caret', '▸');
    const title = h('span', 'caq-excl__title', `מונחים שאי אפשר להיבחן עליהם כאן (${excluded.length})`);
    head.appendChild(caret); head.appendChild(title);

    const body = h('div', 'caq-excl__body');
    body.style.display = 'none';
    body.appendChild(h('p', 'caq-excl__note',
      'חיפשנו את המונחים האלה במודל, אבל הם אינם מבנים בדידים שאפשר לבחור וללחוץ עליהם ' +
      'בנפרד כאן (למשל אזורים כלליים, פני-שטח עדינים או מונחים שנבלעים במבנה גדול יותר). ' +
      'לכן אי אפשר להיבחן עליהם באזור הזה - הם מובאים כאן רק לידיעה.'));
    const items = h('div', 'caq-excl__items');
    excluded.forEach((e) => {
      const row = h('div', 'caq-excl__item');
      row.appendChild(h('span', 'caq-excl__term', e.term));
      if (e.closest) row.appendChild(h('span', 'caq-excl__near', `≈ ${e.closest}`));
      items.appendChild(row);
    });
    body.appendChild(items);

    let open = false;
    head.addEventListener('click', () => {
      open = !open;
      body.style.display = open ? '' : 'none';
      caret.textContent = open ? '▾' : '▸';
      caret.classList.toggle('caq-excl__caret--open', open);
    });

    wrap.appendChild(head); wrap.appendChild(body);
    return wrap;
  };
})();

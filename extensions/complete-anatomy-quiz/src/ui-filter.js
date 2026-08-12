// ui-filter.js - the progress-status filter chip row (זכרתי / לא זכרתי / לא סומן)
// and the setup modal's header subtitle, split out to keep ui-modal focused.
(function () {
  const CAQ = (window.CAQ = window.CAQ || {});
  const h = (tag, cls, txt) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (txt != null) el.textContent = txt;
    return el;
  };

  CAQ._STATUSES = [
    { key: 'known', label: 'זכרתי' },
    { key: 'unknown', label: 'לא זכרתי' },
    { key: 'unmarked', label: 'לא סומן' },
  ];

  // Builds the "הצג:" chip row. `active` is the live Set of shown statuses; onToggle
  // fires after each chip flips. Returns { el, chips, hint } for the modal to drive.
  CAQ._buildFilterRow = function (active, onToggle) {
    const el = h('div', 'caq-filter');
    el.appendChild(h('span', 'caq-filter__label', 'הצג:'));
    const chips = {};
    CAQ._STATUSES.forEach((s) => {
      const chip = h('button', `caq-chip caq-chip--on caq-chip--${s.key}`, s.label);
      chip.addEventListener('click', () => {
        active.has(s.key) ? active.delete(s.key) : active.add(s.key);
        if (!active.size) active.add(s.key);
        chip.classList.toggle('caq-chip--on', active.has(s.key));
        onToggle();
      });
      chips[s.key] = chip;
      el.appendChild(chip);
    });
    const hint = h('span', 'caq-filter__label', 'לחצי על הנקודה שליד איבר כדי לשנות סטטוס: אפור ← ירוק (זכרתי) ← אדום (לא זכרתי)');
    hint.style.flexBasis = '100%';
    el.appendChild(hint);
    return { el, chips, hint };
  };

  // Header subtitle: term counts for a built-in area, a friendlier line otherwise.
  CAQ._areaSubtitle = function (s) {
    if (s.presentTerms == null) return 'אזור מותאם אישית. ייבאי רשימת מונחים או הוסיפי מבנים מהחיפוש כדי לבחון את עצמך.';
    const excl = s.excluded ? s.excluded.length : 0;
    const uniq = s.uniqueStructures || s.presentTerms;
    return `מתוך ${s.totalTerms} האיברים ברשימה, ${s.presentTerms} קיימים במודל וזמינים לתרגול ` +
      `(${uniq} מבנים ייחודיים - המבחן לא חוזר על אותו מבנה). ${excl} האחרים אינם מסומנים במודל הזה.`;
  };
})();

// ui-import.js - "import a word list into this area": paste terms, match each to a
// structure in the model (via CAQ.match, live search), then add the matched ones as
// a new custom list in the active area. Terms that don't resolve to a discrete,
// clickable structure are reported so the user knows what was left out.
(function () {
  const CAQ = (window.CAQ = window.CAQ || {});
  const h = (tag, cls, txt) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (txt != null) el.textContent = txt;
    return el;
  };

  // onImport(listLabel, items[{term,cid,model}]) is called once the user confirms.
  CAQ._openImport = function (areaLabel, onImport) {
    const overlay = h('div', 'caq-root caq-overlay caq-overlay--top');
    const modal = h('div', 'caq-modal caq-modal--sm');
    overlay.appendChild(modal);
    const close = () => overlay.remove();

    const head = h('div', 'caq-modal__head');
    head.appendChild(h('h2', 'caq-modal__title', 'ייבוא רשימה לאזור: ' + (areaLabel || '')));
    head.appendChild(h('p', 'caq-modal__sub',
      'הדביקי את המונחים באנגלית, מונח בכל שורה. נחפש כל מונח במודל ונוסיף את אלה שנמצאו כמבנה בדיד.'));
    modal.appendChild(head);

    const body = h('div', 'caq-modal__body');
    const nameInp = h('input', 'caq-imp__name');
    nameInp.placeholder = 'שם הרשימה (למשל: "ניתוח 10 - אוזן")';
    const ta = h('textarea', 'caq-imp__ta');
    ta.placeholder = 'frontal bone\nmaxilla\nabducens nerve\n…';
    const status = h('p', 'caq-imp__status');
    body.appendChild(nameInp); body.appendChild(ta); body.appendChild(status);
    const result = h('div', 'caq-imp__result');
    body.appendChild(result);
    modal.appendChild(body);

    const foot = h('div', 'caq-modal__foot');
    const spacer = h('div'); spacer.style.flex = '1';
    const cancel = h('button', 'caq-btn caq-btn--ghost', 'ביטול');
    const go = h('button', 'caq-btn', 'התאם והוסף');
    foot.appendChild(spacer); foot.appendChild(cancel); foot.appendChild(go);
    modal.appendChild(foot);

    const terms = () => ta.value.split('\n').map((s) => s.trim()).filter(Boolean);

    cancel.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    go.addEventListener('click', async () => {
      const list = terms();
      if (!list.length) { status.textContent = 'הדביקי לפחות מונח אחד.'; return; }
      if (!CAQ.match || !CAQ.match.hasAuth()) {
        status.textContent = 'לא מחוברים ל-Complete Anatomy. התחברי לאתר ונסי שוב.';
        return;
      }
      go.disabled = true; nameInp.disabled = true; ta.disabled = true;
      result.innerHTML = '';
      status.textContent = `מתאים מונחים… 0/${list.length}`;
      const { matched, excluded } = await CAQ.match.run(list, (d, t) => { status.textContent = `מתאים מונחים… ${d}/${t}`; });
      status.textContent = `נמצאו ${matched.length} מבנים מתוך ${list.length}.`;
      renderResult(matched, excluded);

      if (!matched.length) { go.disabled = false; nameInp.disabled = false; ta.disabled = false; return; }
      // Second click confirms adding the matched structures to the area.
      go.textContent = `הוסף ${matched.length} לאזור`;
      go.disabled = false;
      go.onclick = () => {
        const label = nameInp.value.trim() || 'רשימה מיובאת';
        onImport(label, matched.map((m) => ({ term: m.term, cid: m.cid, model: m.model })));
        close();
      };
    });

    function renderResult(matched, excluded) {
      result.innerHTML = '';
      if (matched.length) {
        const b = h('div', 'caq-imp__box');
        b.appendChild(h('div', 'caq-imp__boxhead', `✓ נמצאו (${matched.length})`));
        matched.forEach((m) => {
          const r = h('div', 'caq-imp__row');
          r.appendChild(h('span', 'caq-excl__term', m.term));
          r.appendChild(h('span', 'caq-excl__near', `→ ${m.model}`));
          b.appendChild(r);
        });
        result.appendChild(b);
      }
      if (excluded.length) {
        const b = h('div', 'caq-imp__box');
        b.appendChild(h('div', 'caq-imp__boxhead caq-imp__boxhead--miss', `לא נמצאו כמבנה בדיד (${excluded.length})`));
        excluded.forEach((e) => {
          const r = h('div', 'caq-imp__row');
          r.appendChild(h('span', 'caq-excl__term', e.term));
          if (e.closest) r.appendChild(h('span', 'caq-excl__near', `≈ ${e.closest}`));
          b.appendChild(r);
        });
        result.appendChild(b);
      }
    }

    document.body.appendChild(overlay);
    nameInp.focus();
    return overlay;
  };
})();

// search-add.js - inject "add to my list" controls onto Complete Anatomy search
// result rows, so structures can be collected into custom study lists.
(function () {
  const CAQ = (window.CAQ = window.CAQ || {});
  const quizActive = () => document.documentElement.classList.contains('caq-quiz-active');

  function rowInfo(li) {
    const cid = (li.getAttribute('data-testid') || '').replace('structure-item-', '');
    const nameEl = li.querySelector('button span span'); // first inner span = display name
    const name = (nameEl ? nameEl.textContent : li.textContent || '').trim();
    return { cid, name };
  }

  function flash(btn, added) {
    btn.textContent = added ? '✓' : '=';
    btn.classList.add('caq-add__quick--done');
    setTimeout(() => { btn.textContent = '+'; btn.classList.remove('caq-add__quick--done'); }, 1000);
  }

  function inject(li) {
    if (li.querySelector('.caq-add')) return;
    const { cid, name } = rowInfo(li);
    if (!cid || !name) return;
    li.classList.add('caq-row');
    const wrap = document.createElement('div');
    wrap.className = 'caq-add caq-root';
    const item = () => ({ term: name, cid, model: name });

    const quick = document.createElement('button');
    quick.type = 'button'; quick.className = 'caq-add__quick'; quick.textContent = '+';
    quick.title = 'הוספה מהירה לרשימה שלי';
    quick.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const { list, result } = CAQ.lists.quickAdd(item());
      flash(quick, result === 'added');
      quick.title = `${result === 'exists' ? 'כבר קיים ב' : 'נוסף ל'}: ${list.label}`;
    });

    const menuBtn = document.createElement('button');
    menuBtn.type = 'button'; menuBtn.className = 'caq-add__menu'; menuBtn.textContent = '▾';
    menuBtn.title = 'בחר רשימה / צור חדשה';
    menuBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      CAQ.addMenu.open(menuBtn, item());
    });

    wrap.appendChild(quick); wrap.appendChild(menuBtn);
    li.appendChild(wrap);
  }

  function scan() {
    if (quizActive()) return; // the extension's own quiz searches must stay untouched
    document.querySelectorAll('li[data-testid^="structure-item-"]').forEach(inject);
  }

  CAQ.searchAdd = {
    start() {
      let scheduled = false;
      const obs = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => { scheduled = false; scan(); });
      });
      obs.observe(document.body, { childList: true, subtree: true });
      scan();
    },
  };
})();

// add-menu.js - a shared popover for adding a structure to a chosen custom list
// or creating a new one, anchored to the clicked search-row button.
(function () {
  const CAQ = (window.CAQ = window.CAQ || {});
  let menu = null;
  let item = null;

  function close() {
    if (menu) { menu.remove(); menu = null; }
    document.removeEventListener('click', onDoc, true);
  }
  function onDoc(e) { if (menu && !menu.contains(e.target)) close(); }

  function itemBtn(label, sub, onClick) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'caq-add-menu__item';
    const l = document.createElement('span'); l.textContent = label; b.appendChild(l);
    if (sub != null) {
      const s = document.createElement('span'); s.className = 'caq-add-menu__sub'; s.textContent = sub;
      b.appendChild(s);
    }
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onClick(); });
    return b;
  }

  function render() {
    menu.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'caq-add-menu__head';
    head.textContent = `הוסף את "${item.term}" ל:`;
    menu.appendChild(head);
    CAQ.lists.targets().forEach((t) => {
      const exists = t.items.some((x) => x.cid === item.cid);
      const label = (t.builtin ? '' : '★ ') + t.label;
      menu.appendChild(itemBtn(label, `${t.items.length} · ${exists ? 'כבר קיים' : 'הוסף'}`, () => {
        CAQ.lists.setActive(t.id);
        CAQ.lists.addItem(t.id, item);
        close();
      }));
    });
    const nw = itemBtn('➕ רשימה חדשה', null, showNew);
    nw.classList.add('caq-add-menu__new');
    menu.appendChild(nw);
  }

  function showNew() {
    menu.innerHTML = '';
    const inp = document.createElement('input');
    inp.className = 'caq-add-menu__input'; inp.placeholder = 'שם הרשימה…';
    const save = () => {
      const name = inp.value.trim();
      if (!name) return;
      const l = CAQ.lists.create(name);
      CAQ.lists.addItem(l.id, item);
      close();
    };
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') save();
      else if (e.key === 'Escape') close();
    });
    const btn = itemBtn('צור והוסף', null, save);
    btn.classList.add('caq-add-menu__new');
    menu.appendChild(inp); menu.appendChild(btn);
    inp.focus();
  }

  function open(anchor, it) {
    close();
    item = it;
    menu = document.createElement('div');
    menu.className = 'caq-add-menu caq-root';
    document.body.appendChild(menu);
    render();
    const r = anchor.getBoundingClientRect();
    menu.style.top = `${Math.min(r.bottom + 6, window.innerHeight - 270)}px`;
    menu.style.left = `${Math.max(8, r.right - 220)}px`;
    setTimeout(() => document.addEventListener('click', onDoc, true), 0);
  }

  CAQ.addMenu = { open };
})();

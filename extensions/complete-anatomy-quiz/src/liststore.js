// liststore.js - study lists you can add search results to: the built-in
// dissection lists (base items + your additions, renamable, hideable) and your
// own custom lists. Persisted: { customLists, additions, labels, hidden, activeId }.
(function () {
  const CAQ = (window.CAQ = window.CAQ || {});
  const KEY = 'caq_lists';
  const ok = () => typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  let state = { customLists: [], additions: {}, labels: {}, hidden: [], activeId: null };
  let builtins = []; // [{id,label,items}] from structures.json - not persisted
  let queue = Promise.resolve();

  // Serialise writes so rapid changes can't race on the read-modify-write.
  function persist() {
    queue = queue.then(async () => {
      if (!ok()) return;
      try { await chrome.storage.local.set({ [KEY]: state }); } catch (e) { /* ignore */ }
    });
    return queue;
  }
  const newId = () => 'usr_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  const custom = (id) => state.customLists.find((l) => l.id === id);
  const builtin = (id) => builtins.find((b) => b.id === id);
  const labelOf = (b) => state.labels[b.id] || b.label;

  // Merged items for a target: built-in base + additions, or a custom list's items.
  function itemsOf(id) {
    const b = builtin(id);
    if (b) return b.items.concat(state.additions[id] || []);
    const l = custom(id);
    return l ? l.items : [];
  }

  CAQ.lists = {
    async init() {
      if (!ok()) return state;
      try {
        const r = await chrome.storage.local.get(KEY);
        if (r[KEY]) state = Object.assign({ customLists: [], additions: {}, labels: {}, hidden: [], activeId: null }, r[KEY]);
      } catch (e) { /* ignore */ }
      return state;
    },
    setBuiltins(groups) { builtins = groups.map((g) => ({ id: g.id, label: g.label, items: g.items })); },
    // Visible add targets in order: built-in (minus hidden) then custom. `added` =
    // how many items the user has added to a built-in list.
    targets() {
      return builtins.filter((b) => !state.hidden.includes(b.id))
        .map((b) => ({ id: b.id, label: labelOf(b), builtin: true, items: itemsOf(b.id), added: (state.additions[b.id] || []).length }))
        .concat(state.customLists.map((l) => ({ id: l.id, label: l.label, builtin: false, items: l.items, added: 0 })));
    },
    hiddenBuiltins() { return builtins.filter((b) => state.hidden.includes(b.id)).map((b) => ({ id: b.id, label: labelOf(b) })); },
    active() { return this.targets().find((t) => t.id === state.activeId) || null; },
    setActive(id) { state.activeId = id; persist(); },
    create(label) {
      const l = { id: newId(), label: (label || 'רשימה חדשה').trim(), items: [] };
      state.customLists.push(l); state.activeId = l.id; persist();
      return { id: l.id, label: l.label, builtin: false, items: l.items };
    },
    rename(id, label) {
      const name = (label || '').trim(); if (!name) return;
      const l = custom(id);
      if (l) l.label = name; else if (builtin(id)) state.labels[id] = name;
      persist();
    },
    remove(id) { state.customLists = state.customLists.filter((l) => l.id !== id); if (state.activeId === id) state.activeId = null; persist(); },
    hide(id) { if (builtin(id) && !state.hidden.includes(id)) { state.hidden.push(id); persist(); } },
    show(id) { state.hidden = state.hidden.filter((h) => h !== id); persist(); },
    clearAdditions(id) { delete state.additions[id]; persist(); },
    has(id, cid) { return itemsOf(id).some((it) => it.cid === cid); },
    // returns 'added' | 'exists' | null
    addItem(id, item) {
      if (this.has(id, item.cid)) return 'exists';
      if (builtin(id)) (state.additions[id] = state.additions[id] || []).push(item);
      else { const l = custom(id); if (!l) return null; l.items.push(item); }
      persist();
      return 'added';
    },
    // Quick-add to the active target, creating a default custom list if none is active.
    quickAdd(item) {
      const t = this.active() || this.create('הרשימה שלי');
      return { list: t, result: this.addItem(t.id, item) };
    },
  };
})();

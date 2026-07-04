// liststore.js - user-created custom study lists, persisted in chrome.storage.local.
// Shape: { lists: [{ id, label, items: [{term, cid, model}] }], activeId }.
(function () {
  const CAQ = (window.CAQ = window.CAQ || {});
  const KEY = 'caq_lists';
  const ok = () => typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  let state = { lists: [], activeId: null };
  let queue = Promise.resolve();

  // Writes are serialised so rapid adds can't race on the read-modify-write.
  function persist() {
    queue = queue.then(async () => {
      if (!ok()) return;
      try { await chrome.storage.local.set({ [KEY]: state }); } catch (e) { /* ignore */ }
    });
    return queue;
  }

  const newId = () =>
    'usr_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

  CAQ.lists = {
    async init() {
      if (!ok()) return state;
      try { const r = await chrome.storage.local.get(KEY); if (r[KEY] && r[KEY].lists) state = r[KEY]; }
      catch (e) { /* ignore */ }
      return state;
    },
    all() { return state.lists; },
    get(id) { return state.lists.find((l) => l.id === id) || null; },
    active() { return this.get(state.activeId); },
    setActive(id) { state.activeId = id; persist(); },
    create(label) {
      const list = { id: newId(), label: (label || 'רשימה חדשה').trim(), items: [] };
      state.lists.push(list);
      state.activeId = list.id;
      persist();
      return list;
    },
    remove(id) {
      state.lists = state.lists.filter((l) => l.id !== id);
      if (state.activeId === id) state.activeId = state.lists[0] ? state.lists[0].id : null;
      persist();
    },
    // returns 'added' | 'exists' | null
    addItem(id, item) {
      const l = this.get(id);
      if (!l) return null;
      if (l.items.some((it) => it.cid === item.cid)) return 'exists';
      l.items.push(item);
      persist();
      return 'added';
    },
    removeItem(id, cid) {
      const l = this.get(id);
      if (!l) return;
      l.items = l.items.filter((it) => it.cid !== cid);
      persist();
    },
    // Quick-add to the active list, auto-creating a default list when none exists.
    quickAdd(item) {
      const list = this.active() || this.create('הרשימה שלי');
      return { list, result: this.addItem(list.id, item) };
    },
  };
})();

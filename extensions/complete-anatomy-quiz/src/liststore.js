// liststore.js - study lists you can add search results to, grouped into AREAS
// (tabs). Built-in areas (brain, head-neck) register their dissection groups at
// startup; the user can add empty areas and their own custom lists inside any area.
// Persisted: { areas, customLists, additions, labels, hidden, activeId }.
(function () {
  const CAQ = (window.CAQ = window.CAQ || {});
  const KEY = 'caq_lists';
  const ok = () => typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  let state = { areas: [], customLists: [], additions: {}, labels: {}, hidden: [], activeId: null };
  // Built-in areas from the bundled JSON - not persisted. Each: {id,label,groups,excluded}.
  let builtinAreas = [];
  let defaultAreaId = null;
  let queue = Promise.resolve();

  // Serialise writes so rapid changes can't race on the read-modify-write.
  function persist() {
    queue = queue.then(async () => {
      if (!ok()) return;
      try { await chrome.storage.local.set({ [KEY]: state }); } catch (e) { /* ignore */ }
    });
    return queue;
  }
  const newId = (p) => (p || 'usr_') + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  const custom = (id) => state.customLists.find((l) => l.id === id);
  const bArea = (id) => builtinAreas.find((a) => a.id === id);
  const bGroup = (id) => builtinAreas.flatMap((a) => a.groups).find((g) => g.id === id);
  const labelOf = (g) => state.labels[g.id] || g.label;
  // Which area a custom list belongs to (orphans from before areas → default area).
  const areaOfList = (l) => l.areaId || defaultAreaId;

  // Merged items for a target: built-in group base + additions, or a custom list's items.
  function itemsOf(id) {
    const g = bGroup(id);
    if (g) return g.items.concat(state.additions[id] || []);
    const l = custom(id);
    return l ? l.items : [];
  }

  function mapCustom(l) { return { id: l.id, label: l.label, builtin: false, items: l.items, added: 0, areaId: areaOfList(l) }; }
  function mapBuiltin(g) { return { id: g.id, label: labelOf(g), builtin: true, items: itemsOf(g.id), added: (state.additions[g.id] || []).length }; }

  CAQ.lists = {
    async init() {
      if (!ok()) return state;
      try {
        const r = await chrome.storage.local.get(KEY);
        if (r[KEY]) state = Object.assign({ areas: [], customLists: [], additions: {}, labels: {}, hidden: [], activeId: null }, r[KEY]);
      } catch (e) { /* ignore */ }
      return state;
    },
    // Register a built-in area with its dissection groups + excluded terms.
    registerArea(id, label, groups, excluded) {
      builtinAreas = builtinAreas.filter((a) => a.id !== id);
      builtinAreas.push({ id, label, groups: groups.map((g) => ({ id: g.id, label: g.label, items: g.items })), excluded: excluded || [] });
      if (!defaultAreaId) defaultAreaId = id;
    },
    // All areas in tab order: built-in first, then user-created.
    areaList() {
      return builtinAreas.map((a) => ({ id: a.id, label: a.label, builtin: true }))
        .concat(state.areas.map((a) => ({ id: a.id, label: a.label, builtin: false })));
    },
    addArea(label) {
      const a = { id: newId('area_'), label: (label || 'אזור חדש').trim() };
      state.areas.push(a); persist();
      return a;
    },
    renameArea(id, label) {
      const name = (label || '').trim(); if (!name) return;
      const a = state.areas.find((x) => x.id === id);
      if (a) { a.label = name; persist(); }
    },
    removeArea(id) {
      state.areas = state.areas.filter((a) => a.id !== id);
      state.customLists = state.customLists.filter((l) => areaOfList(l) !== id);
      persist();
    },
    excludedOf(areaId) { const a = bArea(areaId); return a ? a.excluded : []; },
    // Visible add targets for one area: its built-in groups (minus hidden) then its custom lists.
    targets(areaId) {
      const a = bArea(areaId);
      const bs = a ? a.groups.filter((g) => !state.hidden.includes(g.id)).map(mapBuiltin) : [];
      return bs.concat(state.customLists.filter((l) => areaOfList(l) === areaId).map(mapCustom));
    },
    // Every target across all areas (for the search-row add menu).
    allTargets() {
      return builtinAreas.flatMap((a) => a.groups.filter((g) => !state.hidden.includes(g.id)).map(mapBuiltin))
        .concat(state.customLists.map(mapCustom));
    },
    hiddenBuiltins(areaId) {
      const a = bArea(areaId); if (!a) return [];
      return a.groups.filter((g) => state.hidden.includes(g.id)).map((g) => ({ id: g.id, label: labelOf(g) }));
    },
    active() { return this.allTargets().find((t) => t.id === state.activeId) || null; },
    setActive(id) { state.activeId = id; persist(); },
    create(label, areaId) {
      const l = { id: newId(), areaId: areaId || defaultAreaId, label: (label || 'רשימה חדשה').trim(), items: [] };
      state.customLists.push(l); state.activeId = l.id; persist();
      return { id: l.id, label: l.label, builtin: false, items: l.items, areaId: l.areaId };
    },
    rename(id, label) {
      const name = (label || '').trim(); if (!name) return;
      const l = custom(id);
      if (l) l.label = name; else if (bGroup(id)) state.labels[id] = name;
      persist();
    },
    remove(id) { state.customLists = state.customLists.filter((l) => l.id !== id); if (state.activeId === id) state.activeId = null; persist(); },
    hide(id) { if (bGroup(id) && !state.hidden.includes(id)) { state.hidden.push(id); persist(); } },
    show(id) { state.hidden = state.hidden.filter((h) => h !== id); persist(); },
    clearAdditions(id) { delete state.additions[id]; persist(); },
    has(id, cid) { return itemsOf(id).some((it) => it.cid === cid); },
    // returns 'added' | 'exists' | null
    addItem(id, item) {
      if (this.has(id, item.cid)) return 'exists';
      if (bGroup(id)) (state.additions[id] = state.additions[id] || []).push(item);
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

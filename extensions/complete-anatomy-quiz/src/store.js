// store.js - persists the learner's self-assessment per structure (by cid) in
// chrome.storage.local, so progress survives page reloads and sessions.
// Status values: 'known' (remembered) | 'unknown' (didn't remember).
(function () {
  const CAQ = (window.CAQ = window.CAQ || {});
  const KEY = 'caq_progress';
  const ok = () => typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  // Writes are serialised through this promise chain so rapid successive set()
  // calls can't race on the read-modify-write and clobber each other's changes.
  let queue = Promise.resolve();

  CAQ.store = {
    async load() {
      if (!ok()) return {};
      try {
        const r = await chrome.storage.local.get(KEY);
        return r[KEY] || {};
      } catch (e) {
        return {};
      }
    },
    set(cid, status) {
      queue = queue.then(async () => {
        if (!ok()) return;
        const p = await this.load();
        if (status == null) delete p[cid];
        else p[cid] = status;
        try { await chrome.storage.local.set({ [KEY]: p }); } catch (e) { /* ignore */ }
      });
      return queue;
    },
    clear() {
      queue = queue.then(async () => {
        if (!ok()) return;
        try { await chrome.storage.local.set({ [KEY]: {} }); } catch (e) { /* ignore */ }
      });
      return queue;
    },
  };
})();

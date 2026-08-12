// match.js - term→structure matcher, ported from scripts/headneck-match.js so the
// import feature can resolve pasted terms to model cids live. Runs in the content
// script's isolated world, where window.fetch is the clean native one (the app only
// wraps fetch in the page's MAIN world), and localStorage is the page's own (same
// origin), so the OIDC access token is readable here. See memory: completeanatomy-search-api.
(function () {
  const CAQ = (window.CAQ = window.CAQ || {});
  const MID = '964db2dd4f98052f03baa9ca5f2dbcae';
  const APPID = 'a0bf2d25-68bb-4521-b555-978f5365749d';
  const OIDC = 'oidc.user:https://access.healthcare.elsevier.com/realms/h:gme-completeanatomy-webapp';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const token = () => { try { return JSON.parse(localStorage.getItem(OIDC) || '{}').access_token; } catch (e) { return null; } };

  async function search(q) {
    const url = `https://apigw.healthcare.elsevier.com/h/eca/apigw/search/wc?s=${encodeURIComponent(q)}&model_id=${MID}&version=444&lang=en`;
    try {
      const r = await fetch(url, { headers: {
        authorization: 'Bearer ' + token(), applicationid: APPID, identifier: 'identifier', 'accept-language': 'en',
      } });
      if (!r.ok) return [];
      return await r.json();
    } catch (e) { return []; }
  }

  // Generic type-words are optional (the model omits "Bone"/"Muscle"…) → drop for compare.
  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(of|the|and|part|region|a|an|bone|muscle|cartilage|gland)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();

  const cache = {};
  // Try the full term; on empty, drop a trailing type-word, then the first 2 words, then 1.
  async function searchMulti(term) {
    const tries = [term];
    const t = term.replace(/\s+(bone|muscle|cartilage|gland|nerve|artery|vein|process|ligament|sinus)$/i, '').trim();
    if (t !== term) tries.push(t);
    const w = term.split(/\s+/).filter((x) => x.length > 2);
    if (w.length > 2) tries.push(w.slice(0, 2).join(' '));
    if (w.length > 1) tries.push(w[0]);
    for (const q of tries) {
      if (!(q in cache)) { cache[q] = await search(q); await sleep(45); }
      if ((cache[q] || []).length) return cache[q];
    }
    return [];
  }

  function best(term, cat, cands) {
    const nT = norm(term), tT = nT.split(' ').filter(Boolean);
    const catW = norm(cat).split(' ').filter(Boolean);
    let pick = null, bs = -999;
    for (const c of cands) {
      const act = (c.content_type || []).includes(3) && !c.sname; // muscle-action pseudo entries
      const nN = norm(c.name), nS = norm(c.sname || '');
      const tN = nN.split(' ').filter(Boolean);
      let sc;
      if (nN === nT || (nS && nS === nT)) sc = 100;
      else if (tT.length && tT.every((w) => tN.includes(w))) sc = 72 - 2 * Math.max(0, tN.length - tT.length);
      else { const hit = tT.filter((w) => tN.includes(w)).length; sc = 45 * hit / Math.max(1, tT.length) - 2 * Math.max(0, tN.length - tT.length); }
      if (catW.some((w) => w.length > 3 && tN.includes(w))) sc += 8;
      if (act) sc -= 60;
      if (sc > bs) { bs = sc; pick = c; }
    }
    return { pick, score: Math.round(bs) };
  }

  // terms = [{term, cat?}] or [string]. onProgress(done,total). Score ≥ 70 = confident.
  CAQ.match = {
    hasAuth: () => !!token(),
    async run(terms, onProgress) {
      const list = terms.map((t) => (typeof t === 'string' ? { term: t } : t));
      const matched = [], excluded = [];
      for (let i = 0; i < list.length; i++) {
        const it = list[i];
        const cands = await searchMulti(it.term);
        const { pick, score } = best(it.term, it.cat || '', cands);
        if (pick && score >= 70) matched.push({ term: it.term, cid: pick.cid, model: pick.name, score });
        else excluded.push({ term: it.term, score, closest: pick ? pick.name : null });
        if (onProgress) onProgress(i + 1, list.length);
      }
      return { matched, excluded };
    },
  };
})();

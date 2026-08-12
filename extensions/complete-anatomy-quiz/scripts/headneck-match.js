// headneck-match.js — browser-side term→cid matcher for the Head & Neck model.
// Run inside an AUTHENTICATED completeanatomy.app tab (via Chrome MCP evaluate_script).
// The Elsevier search API needs auth: Bearer access_token (from localStorage OIDC user)
// + applicationid + identifier headers. fetch() is wrapped by the app (mangles absolute
// URLs) so we use XMLHttpRequest. See data/headneck/items.json for the input items.
//
// Usage: paste these onto window, set window.__items = [{d,cat,term}...], then call
//   await window.__match(window.__items.slice(a,b))  -> [{t,d,cat,c,n,s}] (c=cid, s=score)
// Score >= 70 is high-confidence; < 70 needs manual review (region-only terms like
// "cranial fossa" only exist as dura; terse model names like "Greater Wing" score low).

const MID = '964db2dd4f98052f03baa9ca5f2dbcae';
const APPID = 'a0bf2d25-68bb-4521-b555-978f5365749d';
const OIDC = 'oidc.user:https://access.healthcare.elsevier.com/realms/h:gme-completeanatomy-webapp';

window.__tok = () => { try { return JSON.parse(localStorage.getItem(OIDC) || '{}').access_token; } catch (e) { return null; } };

window.__search = (q) => new Promise((res) => {
  const x = new XMLHttpRequest();
  x.open('GET', `https://apigw.healthcare.elsevier.com/h/eca/apigw/search/wc?s=${encodeURIComponent(q)}&model_id=${MID}&version=444&lang=en`, true);
  x.setRequestHeader('authorization', 'Bearer ' + window.__tok());
  x.setRequestHeader('applicationid', APPID);
  x.setRequestHeader('identifier', 'identifier');
  x.setRequestHeader('accept-language', 'en');
  x.onload = () => { try { res(JSON.parse(x.responseText)); } catch (e) { res([]); } };
  x.onerror = () => res([]);
  x.send();
});

// Normalize for comparison; generic type-words are optional (model omits "Bone"/"Muscle").
window.__norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ')
  .replace(/\b(of|the|and|part|region|a|an|bone|muscle|cartilage|gland)\b/g, ' ')
  .replace(/\s+/g, ' ').trim();

window.__cache = {};
// Try the full term; on empty, drop a trailing type-word, then the first 2 words, then 1.
window.__searchMulti = async (term) => {
  const tries = [term];
  const t = term.replace(/\s+(bone|muscle|cartilage|gland|nerve|artery|vein|process|ligament|sinus)$/i, '').trim();
  if (t !== term) tries.push(t);
  const w = term.split(/\s+/).filter((x) => x.length > 2);
  if (w.length > 2) tries.push(w.slice(0, 2).join(' '));
  if (w.length > 1) tries.push(w[0]);
  for (const q of tries) {
    if (!(q in window.__cache)) { window.__cache[q] = await window.__search(q); await new Promise((r) => setTimeout(r, 45)); }
    if ((window.__cache[q] || []).length) return { q, cands: window.__cache[q] };
  }
  return { q: term, cands: [] };
};

window.__match = async (items) => {
  const out = [];
  for (const it of items) {
    const { cands } = await window.__searchMulti(it.term);
    const nT = window.__norm(it.term), tT = nT.split(' ').filter(Boolean);
    const catW = window.__norm(it.cat).split(' ').filter(Boolean);
    let best = null, bs = -999;
    for (const c of cands) {
      const act = (c.content_type || []).includes(3) && !c.sname; // muscle-action pseudo entries
      const nN = window.__norm(c.name), nS = window.__norm(c.sname || '');
      const tN = nN.split(' ').filter(Boolean);
      let sc;
      if (nN === nT || (nS && nS === nT)) sc = 100;
      else if (tT.length && tT.every((w) => tN.includes(w))) sc = 72 - 2 * Math.max(0, tN.length - tT.length);
      else { const hit = tT.filter((w) => tN.includes(w)).length; sc = 45 * hit / Math.max(1, tT.length) - 2 * Math.max(0, tN.length - tT.length); }
      if (catW.some((w) => w.length > 3 && tN.includes(w))) sc += 8; // category-context boost
      if (act) sc -= 60;
      if (sc > bs) { bs = sc; best = c; }
    }
    out.push({ t: it.term, d: it.d, cat: it.cat, c: best ? best.cid : null, n: best ? best.name : null, s: Math.round(bs) });
  }
  return out;
};

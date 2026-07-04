import fs from 'fs';
const collected = JSON.parse(fs.readFileSync(new URL('../data/collected.json', import.meta.url)));
const terms = JSON.parse(fs.readFileSync(new URL('../data/terms.json', import.meta.url)));
const SYN = JSON.parse(fs.readFileSync(new URL('./syn.json', import.meta.url)));

const byCid = new Map();
for(const arr of Object.values(collected)) for(const x of (arr||[])) if(!byCid.has(x.cid)) byCid.set(x.cid,{cid:x.cid,name:x.name,sname:x.sname||''});
const inv=[...byCid.values()];

const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
  .replace(/\b3rd\b/g,'third').replace(/\b4th\b/g,'fourth');
const stripParen = s => s.replace(/\([^)]*\)/g,' ');
const nkey = s => norm(stripParen(s)).replace(/[^a-z0-9]/g,'');
const cleanTerm = t => t.split(/\s+[-=]\s+|\s*\(/)[0].trim();

// index inventory by normalized key of name-base and sname-base
const idx = new Map();
for(const s of inv){
  for(const key of [nkey(s.name), nkey(s.sname)]){
    if(key && !idx.has(key)) idx.set(key, s);
  }
}

// Manual rescue: term -> cid for structures that exist under a slightly different
// model name (verified via inventory lookup, English + Latin). See scripts notes.
const invByCid = new Map(inv.map(s=>[s.cid,s]));
const RESCUE = {
  "Globus pallidus": 18097,          // Lateral Segment of Globus Pallidus
  "Pulvinar of thalamus": 18810,     // Pulvinar Nuclei of Thalamus
  "Vermis": 20663,                   // Vermis of Cerebellum
  "Pyramid": 24645,                  // Pyramid of Medulla Oblongata
  "Pineal body": 20574,              // Pineal Gland
  "Anterior cerebral vein": 18255,   // Anterior Cerebral Veins
  "Orbitofrontal artery": 16477,     // Lateral Orbitofrontal Artery
  "Choroid plexus of 3rd ventricle": 23689 // Choroid Plexus of Third and Fourth Ventricles
};

const results=[];
for(const g of terms.groups) for(const term of g.terms){
  const cands = [cleanTerm(term), ...(SYN[term]||[])];
  let hit=null, via=null;
  for(const c of cands){ const k=nkey(c); if(idx.has(k)){ hit=idx.get(k); via=c; break; } }
  if(!hit && RESCUE[term] && invByCid.has(RESCUE[term])){ hit=invByCid.get(RESCUE[term]); via='rescue'; }
  results.push({group:g.id, term, present:!!hit, cid:hit?hit.cid:null, model:hit?hit.name:null, via});
}
const present = results.filter(r=>r.present);
const absent = results.filter(r=>!r.present);
// per group counts
const byGroup={};
for(const g of terms.groups) byGroup[g.id]={total:g.terms.length, present:results.filter(r=>r.group===g.id&&r.present).length};
fs.writeFileSync(new URL('../data/resolved.json', import.meta.url), JSON.stringify({byGroup, present, absent}, null, 1));
// Build final extension data: present items per group (drop duplicate terms mapping
// to a cid already used by an EARLIER term, to avoid identical highlights with two answers)
const usedCid = new Set();
const outGroups = terms.groups.map(g => ({
  id: g.id, label: g.label,
  items: results.filter(r => r.group===g.id && r.present)
    .filter(r => { if(usedCid.has(r.cid)) return false; usedCid.add(r.cid); return true; })
    .map(r => ({ term: r.term, cid: r.cid, model: r.model }))
}));
const structures = {
  modelId: '964db2dd4f98052f03baa9ca5f2dbcae',
  bodyRegion: 3,
  totalTerms: results.length,
  presentTerms: outGroups.reduce((n,g)=>n+g.items.length,0),
  groups: outGroups,
  excluded: absent.map(a => ({ group:a.group, term:a.term }))
};
fs.writeFileSync(new URL('../src/structures.json', import.meta.url), JSON.stringify(structures, null, 1));
console.log('PRESENT', present.length, '/', results.length, '| unique-in-quiz', structures.presentTerms);
console.log('byGroup', JSON.stringify(byGroup));
console.log('\n--- ABSENT (excluded) ---');
absent.forEach(a=>console.log(`[${a.group}] ${a.term}`));

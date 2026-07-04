import fs from 'fs';
const collected = JSON.parse(fs.readFileSync(new URL('../data/collected.json', import.meta.url)));
const terms = JSON.parse(fs.readFileSync(new URL('../data/terms.json', import.meta.url)));

// Build full inventory from all collected query results
const byCid = new Map();
for(const arr of Object.values(collected)) for(const x of (arr||[])) if(!byCid.has(x.cid)) byCid.set(x.cid,{cid:x.cid,name:x.name,sname:x.sname||'',ct:x.content_type});
const inv = [...byCid.values()];

const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
  .replace(/\b3rd\b/g,'third').replace(/\b4th\b/g,'fourth').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const GLUE = new Set(['of','the','and','a','to','part','left','right','with']);
const stem = t => t.replace(/ies$/,'y').replace(/(uses|us|i|ae|um|es|s)$/,'').replace(/e$/,'');
const toks = s => norm(s).split(' ').filter(w=>w && !GLUE.has(w)).map(stem).filter(Boolean);
const nns = s => norm(s).replace(/ /g,'');
const VESSEL = /\b(artery|arteries|arteria|arteriae|vein|veins|vena|venae|branch|branches|tributary|ligament|muscle|musculus|bone|nerve to|canal|foramen of skull)\b/i;

const cleanTerm = t => t.split(/\s+[-=]\s+|\s*\(/)[0].trim();
const SYN = JSON.parse(fs.readFileSync(new URL('./syn.json', import.meta.url)));

function best(term){
  const cands = [cleanTerm(term), term, ...(SYN[term]||[])];
  const candTokSets = cands.map(toks).filter(a=>a.length);
  const candNS = cands.map(nns);
  const termHasVessel = VESSEL.test(term);
  let bestR=null;
  for(const s of inv){
    const fields = [ {t:toks(s.name), ns:nns(s.name)}, {t:toks(s.sname), ns:nns(s.sname)} ];
    let sc=0;
    for(let ci=0;ci<candTokSets.length;ci++){
      const q=candTokSets[ci], qns=candNS[ci];
      for(const f of fields){
        if(!f.t.length) continue;
        if(f.ns && f.ns===qns){ sc=Math.max(sc,100); continue; }
        const inter=q.filter(w=>f.t.includes(w)).length;
        if(!inter) continue;
        const prec=inter/f.t.length, rec=inter/q.length;
        let s2=100*(2*prec*rec)/(prec+rec);
        sc=Math.max(sc,s2);
      }
    }
    if(!termHasVessel && VESSEL.test(s.name)) sc-=45;
    if(sc>(bestR?bestR.sc:-1)) bestR={cid:s.cid,name:s.name,sname:s.sname,sc:Math.round(sc)};
  }
  return bestR;
}

const out=[]; const counts={strong:0,medium:0,none:0};
for(const g of terms.groups) for(const term of g.terms){
  const b=best(term);
  const cls = b.sc>=88?'strong': b.sc>=62?'medium':'none';
  counts[cls]++; out.push({group:g.id,term,cls,cid:b.cid,match:b.name,sname:b.sname,sc:b.sc});
}
fs.writeFileSync(new URL('../data/match-report.json', import.meta.url), JSON.stringify({counts,out},null,1));
console.log('counts',counts,'total',out.length);
for(const cls of ['medium','none']){
  console.log(`\n=== ${cls.toUpperCase()} ===`);
  out.filter(o=>o.cls===cls).forEach(o=>console.log(`[${o.group}] ${o.term}  ->  ${o.match} | ${o.sname} (${o.sc})`));
}

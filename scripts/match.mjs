import fs from 'fs';
const inv = JSON.parse(fs.readFileSync(new URL('../data/inventory.json', import.meta.url))).structures;
const terms = JSON.parse(fs.readFileSync(new URL('../data/terms.json', import.meta.url)));

const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
  .replace(/\b3rd\b/g,'third').replace(/\b4th\b/g,'fourth')
  .replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const nns = s => norm(s).replace(/ /g,'');
const toks = s => norm(s).split(' ').filter(Boolean);
const STOP = new Set(['of','the','and','a','to','part','branch','left','right','anterior','posterior','superior','inferior','medial','lateral']);
const contentTok = s => toks(s).filter(t=>!STOP.has(t));

// term-level synonym expansion: extra query strings to also try matching against
const SYN = {
  "Mid brain":["mesencephalon"],"Midbrain":["mesencephalon"],
  "Cerebral aqueduct (of Sylvius)":["mesencephalic aqueduct","aqueductus mesencephali","cerebral aqueduct"],
  "foramen of Luschka":["lateral aperture of fourth ventricle","apertura lateralis"],
  "foramen of Magendie":["median aperture of fourth ventricle","apertura mediana"],
  "3rd ventricle":["third ventricle"],"4th ventricle":["fourth ventricle"],
  "Cerebral crus":["cerebral peduncle","crus cerebri"],"Crus cerebri (cerebral peduncle)":["cerebral peduncle"],
  "Perforating arteries (lenticulostriate)":["anterolateral central arteries","lenticulostriate"],
  "Polar frontal artery":["frontopolar artery"],"Superior thalamostriate vein":["thalamostriate vein","superior thalamostriate vein"],
  "Vagal nerve (CN-10)":["vagus nerve"],"Abducent nerve (CN-6)":["abducens nerve"],
  "Transverse gyri of Heschl":["transverse temporal gyrus","anterior transverse temporal gyrus"],
  "Straight (rectus) gyrus":["straight gyrus","gyrus rectus","rectus gyrus"],
  "Tectum (lamina quadrigemina)":["tectum","tectal plate","lamina tecti","quadrigeminal"],
  "Stria medullaris thalami":["stria medullaris","stria medullaris of thalamus"],
  "Pes hippocampus":["pes hippocampi","hippocampus"],
  "Paraterminal gyrus":["paraterminal gyrus","subcallosal gyrus"],
  "Septal area":["subcallosal area","septal area","paraterminal"],
  "U fibers (arcuate)":["arcuate fibers","cerebral arcuate fibers"],
  "Superior longitudinal fasciculus":["superior longitudinal fasciculus"],
  "Inferior longitudinal fasciculus":["inferior longitudinal fasciculus"],
  "Uncinate fibers":["uncinate fasciculus"],
  "Interthalamic adhesion (massa intermedia)":["interthalamic adhesion","massa intermedia"],
  "Periaqueductal grey matter":["periaqueductal gray","central gray","substantia grisea centralis"],
  "Basilary groove":["basilar groove","basilar sulcus","sulcus basilaris"],
  "Dorsal median sulcus":["posterior median sulcus","posterior median sulcus of medulla"],
  "Ventral median sulcus":["anterior median fissure"],
  "Lateral olfactory stria (tract)":["lateral olfactory stria"],
  "Medial olfactory stria (tract)":["medial olfactory stria"],
  "Infundibulum (pituitary stalk) of hypophysis":["infundibulum","pituitary stalk"],
  "Anterior (Frontal) horn of lateral ventricle":["frontal horn of lateral ventricle","anterior horn of lateral ventricle"],
  "Body (Central part) of lateral ventricle":["central part of lateral ventricle","body of lateral ventricle"],
  "Posterior (Occipital) horn of lateral ventricle":["occipital horn of lateral ventricle","posterior horn of lateral ventricle"],
  "Inferior (Temporal) horn of lateral ventricle":["temporal horn of lateral ventricle","inferior horn of lateral ventricle"],
  "Longitudinal cerebral fissure (interhemispheric fissure)":["longitudinal cerebral fissure","longitudinal fissure","interhemispheric"],
  "Lateral sulcus (sylvian fissure)":["lateral sulcus"],
  "Central sulcus (of Rolando)":["central sulcus"],
  "Superior frontal gyrus (medially - medial frontal gyrus)":["superior frontal gyrus","medial frontal gyrus"],
  "Lateral geniculate body (LGB)":["lateral geniculate body","lateral geniculate nucleus","corpus geniculatum laterale"],
  "Medial geniculate body (MGB)":["medial geniculate body","medial geniculate nucleus","corpus geniculatum mediale"],
  "Great cerebral vein (of Galen)":["great cerebral vein"],"Basal vein (of Rosenthal)":["basal vein"],
  "Superior anastomotic vein (of Trolard)":["superior anastomotic vein"],"Inferior anastomotic vein (of Labbe)":["inferior anastomotic vein"],
  "Interventricular foramen (of Monro)":["interventricular foramen"],
  "Cortex":["cerebral cortex","cortex of cerebrum"],
  "White and gray matter":["white matter of cerebrum","gray matter"],
  "Tonsils":["tonsil of cerebellum"],"Uvula":["uvula of cerebellum","uvula of vermis"],
  "Nodule":["nodule of vermis","nodulus"],"Folia":["folium","folia of vermis"],
  "Lingula":["lingula of cerebellum"],
  "Optic radiation":["optic radiation","geniculocalcarine tract"],
  "Medullary velum":["medullary velum"],
  "Superior medullary velum":["superior medullary velum","velum medullare superius"],
  "Inferior medullary velum":["inferior medullary velum","velum medullare inferius"],
};

// clean her term for display-token comparison (strip parens/abbrev)
const cleanTerm = t => t.split(/\s+[-=]\s+|\s*\(/)[0].trim();

function scoreStructure(termQueries, s){
  const names = [norm(s.name), norm(s.sname)];
  const namesNS = [nns(s.name), nns(s.sname)];
  let best = 0;
  for(const q of termQueries){
    const qn = norm(q), qns = nns(q), qtok = contentTok(q);
    for(let i=0;i<2;i++){
      const n = names[i]; if(!n) continue;
      if(namesNS[i]===qns){ best = Math.max(best, 100); continue; }
      const ntok = contentTok(names[i]);
      if(!qtok.length || !ntok.length) continue;
      const inter = qtok.filter(t=>ntok.includes(t)).length;
      const prec = inter/ntok.length, rec = inter/qtok.length;
      let sc = 100*(2*prec*rec)/(prec+rec||1);
      // full phrase substring bonus
      if(n.includes(qn)) sc = Math.max(sc, 70 + 30*(qtok.length/Math.max(ntok.length,1)));
      best = Math.max(best, Math.round(sc));
    }
  }
  return best;
}

const out = [];
let counts = {strong:0, medium:0, none:0};
for(const g of terms.groups){
  for(const term of g.terms){
    const queries = [cleanTerm(term), term, ...(SYN[term]||[])];
    let ranked = inv.map(s=>({s, sc:scoreStructure(queries, s)})).sort((a,b)=>b.sc-a.sc);
    const top = ranked.slice(0,3).map(r=>({cid:r.s.cid, name:r.s.name, sname:r.s.sname, sc:r.sc}));
    const best = top[0];
    let cls = best.sc>=90 ? 'strong' : best.sc>=60 ? 'medium' : 'none';
    counts[cls]++;
    out.push({group:g.id, term, cls, best, top});
  }
}
fs.writeFileSync(new URL('../data/match-report.json', import.meta.url), JSON.stringify({counts, out}, null, 1));
console.log('counts', counts, 'total', out.length);
// print mediums and nones for review
console.log('\n=== MEDIUM (review) ===');
out.filter(o=>o.cls==='medium').forEach(o=>console.log(`[${o.group}] ${o.term}  ->  ${o.best.name} (${o.best.sc})`));
console.log('\n=== NONE (likely absent / spelling) ===');
out.filter(o=>o.cls==='none').forEach(o=>console.log(`[${o.group}] ${o.term}  ->  top: ${o.best.name} (${o.best.sc})`));

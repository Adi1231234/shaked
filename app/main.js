// Wires the scene, the layer bar, the structure list and click-to-identify.
import { createScene, loadHead, focusOn } from './scene.js';
import { buildTree, renderTree, revealRow } from './tree.js';
import { createPicker } from './picking.js';
import { buildLayerBar, tintBranches, showOnlySkin } from './layerbar.js';
import { attachSheet } from './sheet.js';

const MODEL = '../models/head.glb';

const el = (id) => document.getElementById(id);
const stage = el('stage');
const treeHost = el('tree');
const boot = el('boot');

const { scene, camera, controls } = createScene(stage);
const sheet = attachSheet(el('panel'), el('grip'));

loadHead(MODEL, (e) => {
  if (e.lengthComputable) {
    boot.querySelector('.bar').style.width = `${(e.loaded / e.total) * 100}%`;
  }
}).then(({ root, meshes }) => {
  scene.add(root);
  // Frame the head, not the whole model: platysma and trapezius spread to
  // the shoulders and would push the head down to a third of the screen.
  // Her face plus the cranial vault: the skull rises above the mask, so
  // framing on the mask alone crops the crown once the bone layer is on.
  const CROWN = /^(Skin|Frontal bone|Parietal bone|Occipital bone)$/;
  const head = meshes.filter((m) => CROWN.test(m.userData.structure || ''));
  const frame = () => focusOn(head.length ? head : root, camera, controls, 1.12);
  frame();
  // Rotating the phone changes the horizontal field of view, so re-frame.
  scene.userData.onResize = frame;

  const picker = createPicker({
    camera,
    meshes,
    onPick(list, label) {
      el('picked-name').textContent = label || '';
      const first = list[0]?.userData;
      el('picked-path').textContent = first ? first.path.split('/').join(' › ') : '';
      document.body.classList.toggle('has-selection', Boolean(label));
      if (first) revealRow(rowsByMesh.get(list[0]));
    },
  });
  picker.attach(stage);

  const { rowsByMesh } = renderTree(buildTree(meshes), treeHost, (list, label) => {
    picker.select(list, label);
    focusOn(list[0], camera, controls, 3.2);
    // On a phone the sheet covers the model, so get out of the way.
    if (matchMedia('(max-width: 860px)').matches) sheet.close();
  });

  const rootRows = new Map([...treeHost.querySelectorAll(':scope > .row')]
    .map((r) => [r.querySelector('.label').textContent, r]));
  tintBranches(rootRows);
  showOnlySkin(rootRows);
  buildLayerBar(el('layerbar'), rootRows);

  el('count').textContent = new Set(meshes.map((m) => m.userData.structure)).size;
  wireSearch(treeHost, el('search'), sheet);
  el('show-all').onclick = () => setAll(treeHost, true);
  el('hide-all').onclick = () => setAll(treeHost, false);
  document.body.classList.add('ready');
});

/**
 * Rows are built lazily as branches open, so one pass of "expand everything"
 * only reaches the next level down. Keep going until nothing is left folded.
 */
function expandAll(host, maxDepth = 20) {
  for (let i = 0; i < maxDepth; i++) {
    const folded = host.querySelectorAll('.twist[aria-expanded="false"]');
    if (!folded.length) return;
    for (const t of folded) t.click();
  }
}

function wireSearch(host, input, sheet) {
  input.addEventListener('focus', () => sheet.open());
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    host.classList.toggle('searching', Boolean(q));
    if (!q) {
      for (const r of host.querySelectorAll('.row.hit')) r.classList.remove('hit');
      return;
    }
    expandAll(host);
    for (const r of host.querySelectorAll('.row')) {
      const text = r.querySelector('.label').textContent.toLowerCase();
      r.classList.toggle('hit', text.includes(q));
    }
  });
}

function setAll(host, checked) {
  expandAll(host);
  for (const input of host.querySelectorAll('input[type=checkbox]')) {
    if (input.checked !== checked) {
      input.checked = checked;
      input.dispatchEvent(new Event('change'));
    }
  }
}

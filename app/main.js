// Wires the scene, the hierarchical structure list and click-to-identify.
import { createScene, loadHead, focusOn } from './scene.js';
import { buildTree, renderTree, revealRow } from './tree.js';
import { createPicker } from './picking.js';

const MODEL = '../models/head.glb';

const el = (id) => document.getElementById(id);
const stage = el('stage');
const treeHost = el('tree');
const nameOut = el('picked-name');
const pathOut = el('picked-path');
const search = el('search');
const boot = el('boot');

const { scene, camera, controls } = createScene(stage);

loadHead(MODEL, (e) => {
  if (e.lengthComputable) {
    boot.querySelector('.bar').style.width = `${(e.loaded / e.total) * 100}%`;
  }
}).then(({ root, meshes }) => {
  scene.add(root);
  focusOn(root, camera, controls, 1.9);

  const picker = createPicker({
    camera,
    meshes,
    onPick(list, label) {
      nameOut.textContent = label || '';
      const first = list[0]?.userData;
      pathOut.textContent = first ? first.path.split('/').join(' › ') : '';
      document.body.classList.toggle('has-selection', Boolean(label));
      if (first) revealRow(rowsByMesh.get(list[0]));
    },
  });
  picker.attach(stage);

  const tree = buildTree(meshes);
  const { rowsByMesh } = renderTree(tree, treeHost, (list, label) => {
    picker.select(list, label);
    focusOn(list[0], camera, controls);
  });

  el('count').textContent = `${new Set(meshes.map((m) => m.userData.structure)).size}`;
  wireSearch(treeHost, search);
  wireBulk(treeHost);
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

/** Filter rows by substring; matching rows stay lit, the rest dim. */
function wireSearch(host, input) {
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

function wireBulk(host) {
  el('show-all').onclick = () => setAll(host, true);
  el('hide-all').onclick = () => setAll(host, false);
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

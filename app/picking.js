// Click-to-identify: raycast against the visible model, highlight the hit
// structure and report it.
import * as THREE from 'three';
import { SKIN_LAYER } from './scene.js';

const SELECT = new THREE.Color(0xffc25c);
const HOVER = new THREE.Color(0x6fd3e8);

export function createPicker({ camera, meshes, onPick, onHover }) {
  const ray = new THREE.Raycaster();
  ray.layers.enableAll();       // her face sits on its own layer, see scene.js
  const pointer = new THREE.Vector2();
  let selected = [];
  let hovered = [];

  function hit(event) {
    pointer.set((event.clientX / innerWidth) * 2 - 1,
                -(event.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(pointer, camera);
    // Only meshes still switched on in the tree can be picked.
    const visible = meshes.filter((m) => m.visible && isShown(m));
    const hits = ray.intersectObjects(visible, false);
    // Her face is painted over the anatomy, so a tap on it has to name the
    // skin even though a tooth or an eyeball is physically a little nearer.
    const face = hits.find((h) => h.object.layers.isEnabled(SKIN_LAYER));
    return (face || hits[0])?.object || null;
  }

  function isShown(mesh) {
    for (let o = mesh.parent; o; o = o.parent) if (!o.visible) return false;
    return true;
  }

  // Blend toward the highlight rather than replacing the colour. A full swap
  // turned her whole textured face flat orange when the skin was selected.
  function paint(list, colour, amount = 0.45) {
    for (const m of list) {
      m.material.color.copy(m.userData.baseColor).lerp(colour, amount);
    }
  }

  function restore(list) {
    for (const m of list) m.material.color.copy(m.userData.baseColor);
  }

  /** Both sides of a paired structure light up together. */
  function siblings(mesh) {
    const { structure, path } = mesh.userData;
    return meshes.filter((m) => m.userData.structure === structure
                             && m.userData.path === path);
  }

  function select(list, label) {
    restore(selected);
    selected = list || [];
    paint(selected, SELECT, 0.55);
    onPick?.(selected, label);
  }

  return {
    select,
    selectMesh(mesh) { select(siblings(mesh), mesh.userData.structure); },
    attach(element) {
      element.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const m = hit(e);
        if (m) select(siblings(m), m.userData.structure);
        else select([], null);
      });

      let idle = null;
      element.addEventListener('pointermove', (e) => {
        clearTimeout(idle);
        idle = setTimeout(() => {
          const m = hit(e);
          const next = m ? siblings(m) : [];
          if (same(next, hovered)) return;
          restore(hovered.filter((x) => !selected.includes(x)));
          hovered = next.filter((x) => !selected.includes(x));
          paint(hovered, HOVER, 0.35);
          onHover?.(m ? m.userData : null);
        }, 30);
      });
    },
  };
}

const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

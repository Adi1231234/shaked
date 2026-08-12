// Builds the hierarchical structure list from each mesh's `path` extra and
// keeps 3D visibility in sync with its checkboxes.

/** Group meshes into a nested tree keyed by their anatomical path. */
export function buildTree(meshes) {
  const root = { name: '', children: new Map(), items: new Map(), parent: null };

  for (const mesh of meshes) {
    const { path = '', structure = mesh.name } = mesh.userData;
    let node = root;
    for (const segment of path.split('/').filter(Boolean)) {
      if (!node.children.has(segment)) {
        node.children.set(segment,
          { name: segment, children: new Map(), items: new Map(), parent: node });
      }
      node = node.children.get(segment);
    }
    // Left and right of the same structure share one row.
    if (!node.items.has(structure)) node.items.set(structure, []);
    node.items.get(structure).push(mesh);
  }
  return root;
}

function countLeaves(node) {
  let n = node.items.size;
  for (const child of node.children.values()) n += countLeaves(child);
  return n;
}

/**
 * Render the tree into `host`.
 * `onSelect(meshes, label)` fires when a row's name is clicked.
 */
export function renderTree(root, host, onSelect) {
  const rowsByMesh = new Map();

  function makeRow(label, depth, { expandable, count }) {
    const row = document.createElement('div');
    row.className = 'row';
    row.style.setProperty('--depth', depth);
    row.innerHTML = `
      <button class="twist" aria-expanded="false"${expandable ? '' : ' hidden'}></button>
      <input type="checkbox" checked>
      <span class="label"></span>
      ${count ? `<span class="count">${count}</span>` : ''}`;
    row.querySelector('.label').textContent = label;
    return row;
  }

  function renderNode(node, depth, parentEl) {
    for (const child of [...node.children.values()].sort(byName)) {
      const row = makeRow(child.name, depth,
        { expandable: true, count: countLeaves(child) });
      const kids = document.createElement('div');
      kids.className = 'children';
      kids.hidden = true;
      parentEl.append(row, kids);

      const twist = row.querySelector('.twist');
      twist.onclick = () => {
        kids.hidden = !kids.hidden;
        twist.setAttribute('aria-expanded', String(!kids.hidden));
        if (!kids.dataset.built) {
          renderNode(child, depth + 1, kids);
          kids.dataset.built = '1';
        }
      };
      row.querySelector('input').onchange = (e) => cascade(kids, e.target.checked, child);
      row.querySelector('.label').onclick = () => twist.click();
      child.el = { row, kids };
    }

    for (const [structure, meshes] of [...node.items].sort((a, b) => byName(a[0], b[0]))) {
      const sides = meshes.map((m) => m.userData.side).filter(Boolean);
      const suffix = sides.length === 2 ? ' ·2' : sides[0] ? ` ·${sides[0][0].toUpperCase()}` : '';
      const row = makeRow(structure + suffix, depth, { expandable: false });
      parentEl.append(row);
      row.querySelector('input').onchange = (e) => {
        for (const m of meshes) m.visible = e.target.checked;
      };
      row.querySelector('.label').onclick = () => onSelect(meshes, structure);
      for (const m of meshes) rowsByMesh.set(m, row);
    }
  }

  /** Apply a branch checkbox to everything under it, DOM built or not. */
  function cascade(kidsEl, checked, node) {
    for (const input of kidsEl.querySelectorAll('input')) input.checked = checked;
    (function walk(n) {
      for (const meshes of n.items.values()) {
        for (const m of meshes) m.visible = checked;
      }
      for (const c of n.children.values()) walk(c);
    })(node);
  }

  renderNode(root, 0, host);
  return { rowsByMesh };
}

const byName = (a, b) => {
  const x = a.name ?? a, y = b.name ?? b;
  return String(x).localeCompare(String(y));
};

/** Open every ancestor of a row so it becomes visible, then scroll to it. */
export function revealRow(row) {
  if (!row) return;
  for (let el = row.parentElement; el; el = el.parentElement) {
    if (el.classList?.contains('children') && el.hidden) {
      el.previousElementSibling?.querySelector('.twist')?.click();
    }
  }
  row.scrollIntoView({ block: 'center' });
}

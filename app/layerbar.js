// The quick layer bar: one tap peels a whole system. On a phone this is the
// main control, so it stays reachable without opening the structure list.

// Ordered outside in, the way you would actually dissect.
export const SYSTEMS = [
  { root: 'Integument', label: 'עור', token: '--sys-integument' },
  { root: 'Muscular system', label: 'שרירים', token: '--sys-muscular' },
  { root: 'Skeletal system', label: 'עצמות', token: '--sys-skeletal' },
  { root: 'Arthrology', label: 'מפרקים', token: '--sys-arthro' },
  { root: 'Nervous system', label: 'עצבים וחושים', token: '--sys-nervous' },
  { root: 'Visceral systems', label: 'איברים', token: '--sys-visceral' },
  { root: 'Lymphoid system', label: 'לימפה', token: '--sys-lymphoid' },
  { root: 'Cardiovascular system', label: 'כלי דם', token: '--sys-cardio' },
];

/**
 * Build the bar. `rootRows` maps a top-level tree label to its checkbox, so a
 * chip and the tree stay in step whichever one is used.
 */
export function buildLayerBar(host, rootRows, onToggle) {
  const chips = new Map();

  for (const sys of SYSTEMS) {
    const row = rootRows.get(sys.root);
    if (!row) continue;                       // system absent from this build
    const input = row.querySelector('input');

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'layer-chip';
    chip.style.setProperty('--chip', `var(${sys.token})`);
    chip.setAttribute('aria-pressed', String(input.checked));
    chip.innerHTML = `<span class="dot"></span><span></span>`;
    chip.lastElementChild.textContent = sys.label;
    chip.title = sys.root;

    chip.onclick = () => {
      input.checked = !input.checked;
      input.dispatchEvent(new Event('change'));
      chip.setAttribute('aria-pressed', String(input.checked));
      onToggle?.(sys.root, input.checked);
    };
    host.appendChild(chip);
    chips.set(sys.root, chip);

    // Keep the chip honest if the tree checkbox is changed directly.
    input.addEventListener('change', () =>
      chip.setAttribute('aria-pressed', String(input.checked)));
  }
  return chips;
}

/**
 * Opening state: everything on.
 *
 * Turning every system on used to mean a flayed head, because the muscles won
 * the depth test against her much thinner face. The viewer now draws her skin
 * over the anatomy instead, so the whole model can be on from the start and
 * peeling is a matter of taking layers off rather than putting them on.
 */
export function showEverything(rootRows) {
  for (const sys of SYSTEMS) {
    const row = rootRows.get(sys.root);
    if (!row) continue;
    const input = row.querySelector('input');
    if (!input.checked) {
      input.checked = true;
      input.dispatchEvent(new Event('change'));
    }
  }
}


/** Tint each top-level branch with its system colour. */
export function tintBranches(rootRows) {
  for (const sys of SYSTEMS) {
    const row = rootRows.get(sys.root);
    if (!row) continue;
    row.style.setProperty('--sys', `var(${sys.token})`);
    row.querySelector('.label').style.color = `var(${sys.token})`;
    const kids = row.nextElementSibling;
    if (kids?.classList.contains('children')) {
      kids.classList.add('branch');
      kids.style.setProperty('--sys',
        `color-mix(in srgb, var(${sys.token}) 35%, transparent)`);
    }
  }
}

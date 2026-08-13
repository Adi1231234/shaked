// The greeting that meets her the moment the site opens.

// \u00A0 keeps "לאורך השנה" on one line, so a narrow phone never splits it.
const LINES = [
  'יפה שלי,',
  'את הכי יפה ומוצלחת בעולם,',
  'עבדת קשה לאורך\u00A0השנה ועשית את זה!',
  'אני אוהב וגאה בך בטירוף,',
  'את הכי טובה בעולם!!!!',
];

export function buildOverlay() {
  const root = document.createElement('div');
  root.className = 'celebrate';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'ברכה');

  root.innerHTML = `
    <canvas class="celebrate__caps" aria-hidden="true"></canvas>
    <div class="celebrate__card">
      <p class="celebrate__cap" aria-hidden="true">🎓</p>
      <h2 class="celebrate__note">
        ${LINES.map((line, i) => `<span style="--i:${i}">${line}</span>`).join('')}
      </h2>
      <button class="celebrate__go" type="button">יאללה, קדימה ❤️</button>
    </div>
  `;

  return root;
}

/** Fade the greeting out, let the caps finish falling, then clean up. */
export function dismissOverlay(root, confetti, onDone) {
  if (root.classList.contains('celebrate--leaving')) return;
  root.classList.add('celebrate--leaving');
  confetti?.settle();
  document.body.classList.remove('celebrating');
  setTimeout(() => {
    confetti?.destroy();
    root.remove();
    onDone?.();
  }, 2600);
}

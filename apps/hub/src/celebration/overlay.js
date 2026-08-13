// The greeting that meets her the moment the site opens.

// \u00A0 keeps "כל השנה" on one line, so a narrow phone never splits it.
const LINES = [
  'יפה שלי,',
  'את הכי יפה ומוצלחת בעולם,',
  'עבדת קשה כל\u00A0השנה ועשית את זה!',
  'אני אוהב וגאה בך בטירוף,',
  'את הכי טובה בעולם!!!!',
];

export function buildOverlay() {
  const root = document.createElement('div');
  root.className = 'celebrate';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'ברכת סיום התואר');

  // Two canvases: caps fly behind the note and, closer to the eye, in front of
  // it. The depth is what makes the toss readable instead of a background blur.
  root.innerHTML = `
    <div class="celebrate__sky" aria-hidden="true"></div>
    <div class="celebrate__beam" aria-hidden="true"></div>
    <canvas class="celebrate__stage celebrate__stage--back" aria-hidden="true"></canvas>

    <div class="celebrate__scene">
      <p class="celebrate__cap" aria-hidden="true">🎓</p>
      <h2 class="celebrate__note">
        ${LINES.map((line, i) => `<span style="--i:${i}">${line}</span>`).join('')}
      </h2>
      <button class="celebrate__go" type="button">בואי תראי ❤️</button>
      <p class="celebrate__hint">געי במסך לעוד כובעים</p>
    </div>

    <canvas class="celebrate__stage celebrate__stage--front" aria-hidden="true"></canvas>
  `;

  return root;
}

/** Fade the greeting out, let the caps already in the air finish falling. */
export function dismissOverlay(root, stage, onDone) {
  if (root.classList.contains('celebrate--leaving')) return;
  root.classList.add('celebrate--leaving');
  document.body.classList.remove('celebrating');
  stage?.settle();
  setTimeout(() => {
    stage?.destroy();
    root.remove();
    onDone?.();
  }, 2400);
}

// The greeting that meets her the moment the site opens.

// \u00A0 keeps "לאורך השנה" on one line, so a narrow phone never splits it.
const LINES = [
  'יפה שלי,',
  'את הכי יפה ומוצלחת בעולם,',
  'עבדת קשה לאורך\u00A0השנה ועשית את זה!',
  'אני אוהב וגאה בך בטירוף,',
  'את הכי טובה בעולם!!!!',
];

const NAME = 'שקד';

export function buildOverlay() {
  const root = document.createElement('div');
  root.className = 'celebrate';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'ברכת סיום התואר');

  root.innerHTML = `
    <div class="celebrate__sky" aria-hidden="true"></div>
    <div class="celebrate__beam" aria-hidden="true"></div>
    <canvas class="celebrate__stage" aria-hidden="true"></canvas>

    <div class="celebrate__scene">
      <p class="celebrate__eyebrow">המבחן האחרון · סוף התואר</p>
      <p class="celebrate__name" aria-hidden="true">
        ${[...NAME].map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join('')}
      </p>
      <h2 class="celebrate__note">
        ${LINES.map((line, i) => `<span style="--i:${i}">${line}</span>`).join('')}
      </h2>
      <button class="celebrate__go" type="button">יאללה, קדימה ❤️</button>
      <p class="celebrate__hint">געי במסך לעוד כובעים</p>
    </div>
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

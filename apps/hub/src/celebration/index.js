import './celebration.css';
import { startConfetti } from './confetti.js';
import { buildOverlay, dismissOverlay } from './overlay.js';

/** Shows the graduation greeting over the hub, every time the site is opened. */
export function celebrate() {
  const root = buildOverlay();
  document.body.append(root);
  document.body.classList.add('celebrating');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const confetti = reduced ? null : startConfetti(root.querySelector('.celebrate__caps'));

  const close = () => dismissOverlay(root, confetti);
  root.querySelector('.celebrate__go').addEventListener('click', close);
  // Tapping anywhere outside the card works too - easier than aiming on a phone.
  root.addEventListener('click', (event) => {
    if (!event.target.closest('.celebrate__card')) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
}

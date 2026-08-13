import './stage.css';
import './message.css';
import { createStage } from './stage.js';
import { buildOverlay, dismissOverlay } from './overlay.js';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Shows the graduation greeting over the hub, every time the site is opened. */
export function celebrate() {
  const root = buildOverlay();
  document.body.append(root);
  document.body.classList.add('celebrating');

  const stage = reducedMotion() ? null : createStage(root.querySelector('.celebrate__stage'));
  let stream = 0;

  if (stage) {
    // The scene: the beam opens, then the caps go up, then more keep coming.
    setTimeout(() => stage.openingToss(), 320);
    setTimeout(() => {
      stream = stage.keepAlive();
      root.classList.add('celebrate--playful');
    }, 1900);

    // Every touch throws another handful from wherever she pressed.
    root.addEventListener('pointerdown', (event) => {
      if (event.target.closest('.celebrate__go')) return;
      stage.burst(event.clientX, event.clientY, 0.7);
    });
  }

  const close = () => {
    clearInterval(stream);
    if (stage) stage.burst(stage.size().width / 2, stage.size().height * 0.62, 1.2);
    dismissOverlay(root, stage);
  };

  root.querySelector('.celebrate__go').addEventListener('click', close);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
}

// The canvas stage: one rAF loop, one particle list, and a burst() that fires
// a cap toss from wherever you point it.

import { cap, draw, ribbon, shockwave, spark, update } from './particles.js';

/** A phone gets a smaller cast than a desktop, so the frame rate holds. */
const scaleFor = (width) => Math.min(Math.max(width / 1200, 0.5), 1);

/** Hard ceiling so holding a finger on the screen can't grow the cast forever. */
const maxParticles = (width) => Math.round(260 * scaleFor(width)) + 120;

export function createStage(canvas) {
  const ctx = canvas.getContext('2d');
  let parts = [];
  let width = 0;
  let height = 0;
  let raf = 0;
  let last = performance.now();
  let alive = true;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  window.addEventListener('resize', resize);

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    ctx.clearRect(0, 0, width, height);

    parts = parts.filter((p) => {
      const living = update(p, dt);
      if (!living) return false;
      // let them arc well above the top, but drop them once they are gone below
      if (p.y > height + 90 || p.x < -160 || p.x > width + 160) return false;
      draw(ctx, p);
      return true;
    });

    if (alive || parts.length) raf = requestAnimationFrame(tick);
  }

  raf = requestAnimationFrame(tick);

  /** One toss: caps + ribbons launched from (x, y), with a flash and a ring. */
  function burst(x, y, strength = 1) {
    const s = scaleFor(width) * strength;
    const caps = Math.round(26 * s);
    const ribbons = Math.round(30 * s);
    const sparks = Math.round(22 * s);
    // Aim the arc to peak inside the frame. Overshooting the top looks like the
    // caps vanished; peaking around three quarters up keeps them on screen.
    const shot = { apex: (y - height * 0.14) * strength, spread: width * 0.36 * strength };

    for (let i = 0; i < caps; i++) parts.push(cap(x + Math.random() * 70 - 35, y, shot));
    for (let i = 0; i < ribbons; i++) parts.push(ribbon(x + Math.random() * 70 - 35, y, shot));
    for (let i = 0; i < sparks; i++) parts.push(spark(x, y));
    parts.push(shockwave(x, y));

    const ceiling = maxParticles(width);
    if (parts.length > ceiling) parts.splice(0, parts.length - ceiling);
  }

  return {
    burst,
    /** The big opening toss, thrown up from the bottom of the screen. */
    openingToss() {
      burst(width / 2, height + 20, 1.35);
      setTimeout(() => burst(width * 0.2, height + 20, 0.75), 260);
      setTimeout(() => burst(width * 0.8, height + 20, 0.75), 420);
    },
    /** Keeps a gentle stream going so the stage never falls still. */
    keepAlive() {
      return setInterval(() => {
        if (alive) burst(Math.random() * width, height + 20, 0.45);
      }, 1600);
    },
    size: () => ({ width, height }),
    settle() {
      alive = false;
    },
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    },
  };
}

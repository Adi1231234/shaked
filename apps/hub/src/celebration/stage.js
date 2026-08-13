// The canvas stage: one rAF loop over two layers - caps behind the note and
// caps in front of it - and a burst() that fires a cap toss from any point.

import { cap, draw, ribbon, shockwave, spark, update } from './particles.js';

/** A phone gets a smaller cast than a desktop, so the frame rate holds. */
const scaleFor = (width) => Math.min(Math.max(width / 1200, 0.5), 1);

/** Hard ceiling so holding a finger on the screen can't grow the cast forever. */
const maxParticles = (width) => Math.round(240 * scaleFor(width)) + 100;

// Two full-screen canvases at DPR 3 is a lot of pixels to clear every frame for
// confetti, and nobody counts the pixels on a flying cap.
const MAX_DPR = 1.5;

export function createStage(backCanvas, frontCanvas) {
  const layers = [
    { canvas: backCanvas, ctx: backCanvas.getContext('2d') },
    { canvas: frontCanvas, ctx: frontCanvas.getContext('2d') },
  ];
  let parts = [];
  let width = 0;
  let height = 0;
  let dpr = 1;
  let raf = 0;
  let last = performance.now();
  let alive = true;
  // Rolling cost of the draw work, and the budget multiplier it drives.
  let workMs = 0;
  let quality = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    width = backCanvas.clientWidth;
    height = backCanvas.clientHeight;
    for (const { canvas } of layers) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
  }

  resize();
  window.addEventListener('resize', resize);

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const started = performance.now();

    for (const { ctx } of layers) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width * dpr, height * dpr);
    }

    parts = parts.filter((p) => {
      if (!update(p, dt)) return false;
      // let them arc above the top, but drop them once they are gone below
      if (p.y > height + 120 || p.x < -200 || p.x > width + 200) return false;
      draw(layers[p.front ? 1 : 0].ctx, p, dpr);
      return true;
    });

    // If the device is struggling, thin the cast out rather than drop frames.
    workMs += (performance.now() - started - workMs) * 0.05;
    if (workMs > 7) quality = Math.max(0.3, quality - 0.02);
    else if (workMs < 3) quality = Math.min(1, quality + 0.01);

    if (alive || parts.length) raf = requestAnimationFrame(tick);
  }

  raf = requestAnimationFrame(tick);

  /** One toss: caps + ribbons launched from (x, y), with a flash and a ring. */
  function burst(x, y, strength = 1) {
    const s = scaleFor(width) * strength * quality;
    // Aim the arc to peak inside the frame. Overshooting the top looks like the
    // caps vanished; peaking around three quarters up keeps them on screen.
    const shot = { apex: (y - height * 0.14) * strength, spread: width * 0.36 * strength };
    const jitter = () => x + Math.random() * 70 - 35;

    for (let i = 0; i < Math.round(30 * s); i++) parts.push(cap(jitter(), y, shot));
    for (let i = 0; i < Math.round(7 * s); i++) parts.push(cap(jitter(), y, shot, true));
    for (let i = 0; i < Math.round(16 * s); i++) parts.push(ribbon(jitter(), y, shot));
    for (let i = 0; i < Math.round(20 * s); i++) parts.push(spark(x, y));
    parts.push(shockwave(x, y));

    const ceiling = Math.round(maxParticles(width) * quality);
    if (parts.length > ceiling) parts.splice(0, parts.length - ceiling);
  }

  return {
    burst,
    /** The big opening toss, thrown up from the bottom of the screen. */
    openingToss() {
      burst(width / 2, height + 20, 1.35);
      setTimeout(() => burst(width * 0.18, height + 20, 0.8), 260);
      setTimeout(() => burst(width * 0.82, height + 20, 0.8), 420);
    },
    /** Keeps a gentle stream going so the stage never falls still. */
    keepAlive() {
      return setInterval(() => {
        if (alive) burst(Math.random() * width, height + 20, 0.5);
      }, 1400);
    },
    size: () => ({ width, height }),
    stats: () => ({ workMs: +workMs.toFixed(2), quality: +quality.toFixed(2), parts: parts.length }),
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

// A canvas rain of graduation caps. Canvas rather than DOM nodes so a phone can
// carry a hundred of them at 60fps without the layout engine breaking a sweat.

// Graduation caps, with the odd heart mixed in. Change the mix here.
const GLYPHS = ['🎓', '🎓', '🎓', '🎓', '🎓', '🎓', '🎓', '❤️'];
const rand = (min, max) => min + Math.random() * (max - min);

/** Fewer pieces on a phone, more on a desktop - tuned by viewport width. */
function pieceCount(width) {
  return Math.round(Math.min(Math.max(width / 1440, 0.45), 1) * 150);
}

function spawn(width, height, seeded) {
  const size = rand(20, 46);
  return {
    x: rand(-40, width + 40),
    // seeded pieces start scattered mid-air so the screen fills instantly
    y: seeded ? rand(-height, height) : rand(-height * 0.4, -size),
    size,
    vy: rand(55, 130) * (size / 34),
    drift: rand(-26, 26),
    sway: rand(14, 42),
    phase: rand(0, Math.PI * 2),
    rot: rand(0, Math.PI * 2),
    vrot: rand(-1.4, 1.4),
    glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
  };
}

export function startConfetti(canvas) {
  const ctx = canvas.getContext('2d');
  let pieces = [];
  let width = 0;
  let height = 0;
  let raining = true;
  let frame = 0;
  let last = performance.now();

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  }

  resize();
  pieces = Array.from({ length: pieceCount(width) }, () => spawn(width, height, true));
  window.addEventListener('resize', resize);

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    ctx.clearRect(0, 0, width, height);

    for (const p of pieces) {
      p.y += p.vy * dt;
      p.phase += dt * 1.5;
      p.rot += p.vrot * dt;
      const x = p.x + p.drift * dt + Math.sin(p.phase) * p.sway;

      ctx.save();
      ctx.translate(x, p.y);
      ctx.rotate(p.rot);
      ctx.font = `${p.size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
      ctx.fillText(p.glyph, 0, 0);
      ctx.restore();

      if (p.y - p.size > height) {
        if (raining) Object.assign(p, spawn(width, height, false));
        else p.y = Infinity;
      }
    }

    pieces = pieces.filter((p) => p.y !== Infinity);
    if (pieces.length) frame = requestAnimationFrame(tick);
  }

  frame = requestAnimationFrame(tick);

  return {
    /** Stop refilling; the caps already on screen finish their fall. */
    settle() {
      raining = false;
    },
    destroy() {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    },
  };
}

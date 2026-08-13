// The things flying around the stage: tossed caps, fluttering ribbons, and the
// spark flash and ring that go off at the moment of a toss.

import { SPRITE_SIZE, glyphSprite } from './sprites.js';

const CAPS = ['🎓', '🎓', '🎓', '🎓', '🎓', '❤️'];
const RIBBON_COLORS = ['#ff3d7f', '#a855f7', '#22d3ee', '#ffd166', '#ffffff'];
const GRAVITY = 1500;

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

/**
 * Launch speed for a throw that peaks `apex` pixels above where it started.
 * Derived from the apex rather than hard-coded, so the toss reaches the top of
 * a tall phone and a short laptop alike.
 */
const speedForApex = (apex) => Math.sqrt(2 * GRAVITY * Math.max(apex, 40));

/**
 * A cap thrown up from (x, y) - real launch velocity, then gravity takes it.
 * `front` caps are drawn over the note: bigger and nearer, so the toss reads as
 * depth rather than as a texture somewhere in the background.
 */
export function cap(x, y, { apex, spread }, front = false) {
  return {
    kind: 'cap',
    front,
    x,
    y,
    vx: rand(-spread, spread) * (front ? 1.15 : 1),
    vy: -speedForApex(apex * (front ? rand(0.5, 1.05) : rand(0.38, 1))),
    size: front ? rand(58, 104) : rand(26, 60),
    rot: rand(0, Math.PI * 2),
    vrot: rand(-5, 5),
    glyph: pick(CAPS),
    life: 1,
  };
}

export function ribbon(x, y, { apex, spread }) {
  return {
    kind: 'ribbon',
    x,
    y,
    vx: rand(-spread * 1.15, spread * 1.15),
    vy: -speedForApex(apex * rand(0.34, 0.95)),
    w: rand(7, 13),
    h: rand(13, 24),
    rot: rand(0, Math.PI * 2),
    vrot: rand(-7, 7),
    flip: rand(0, Math.PI * 2),
    color: pick(RIBBON_COLORS),
    life: 1,
  };
}

export function spark(x, y) {
  const angle = rand(0, Math.PI * 2);
  const speed = rand(120, 620);
  return {
    kind: 'spark',
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 120,
    size: rand(2, 4.5),
    color: pick(RIBBON_COLORS),
    life: 1,
    decay: rand(0.9, 1.8),
  };
}

/** An expanding ring that marks where a toss went off. */
export function shockwave(x, y) {
  return { kind: 'wave', x, y, r: 8, life: 1, decay: 1.5 };
}

export function update(p, dt) {
  if (p.kind === 'wave') {
    p.r += 620 * dt;
    p.life -= p.decay * dt;
    return p.life > 0;
  }

  p.vy += GRAVITY * dt * (p.kind === 'spark' ? 0.5 : 1);
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  if (p.kind === 'spark') {
    p.life -= p.decay * dt;
    return p.life > 0;
  }

  p.rot += p.vrot * dt;
  if (p.kind === 'ribbon') p.flip += dt * 9;
  return true;
}

/**
 * Draws straight through setTransform rather than save/translate/rotate/restore
 * - one matrix write instead of four state operations per particle - and blits
 * cached glyph bitmaps instead of laying out emoji text. `dpr` is folded into
 * the matrix because setTransform replaces the canvas's own scaling.
 */
export function draw(ctx, p, dpr) {
  if (p.kind === 'wave') {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = Math.max(p.life, 0) * 0.5;
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }

  if (p.kind === 'spark') {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = Math.max(p.life, 0);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }

  const cos = Math.cos(p.rot);
  const sin = Math.sin(p.rot);

  if (p.kind === 'ribbon') {
    const f = Math.cos(p.flip);
    ctx.setTransform(cos * dpr, sin * dpr, -sin * f * dpr, cos * f * dpr, p.x * dpr, p.y * dpr);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    return;
  }

  const k = p.size / SPRITE_SIZE;
  ctx.setTransform(cos * k * dpr, sin * k * dpr, -sin * k * dpr, cos * k * dpr, p.x * dpr, p.y * dpr);
  ctx.drawImage(glyphSprite(p.glyph), -SPRITE_SIZE / 2, -SPRITE_SIZE / 2);
}

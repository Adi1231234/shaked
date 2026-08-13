// Colour emoji are rasterised by the font engine, and ctx.fillText re-does that
// work for every glyph on every frame. Measured on this machine: 250 caps cost
// 380ms per frame that way and 0.6ms as cached bitmaps - a 640x difference, the
// whole reason the toss stuttered. So each glyph is drawn once into an
// offscreen canvas and blitted from then on.

const SIZE = 128;
const cache = new Map();

export function glyphSprite(glyph) {
  let sprite = cache.get(glyph);
  if (sprite) return sprite;

  sprite = document.createElement('canvas');
  sprite.width = SIZE;
  sprite.height = SIZE;
  const ctx = sprite.getContext('2d');
  ctx.font = `${SIZE * 0.8}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, SIZE / 2, SIZE / 2);

  cache.set(glyph, sprite);
  return sprite;
}

export const SPRITE_SIZE = SIZE;

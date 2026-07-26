// Bottom-sheet behaviour for the structure list on a phone.
//
// Drag the grip to open or close; the sheet follows the finger and settles on
// release based on where it ended up and how fast it was moving, so a quick
// flick works as well as a slow drag.

const PHONE = '(max-width: 860px)';
const FLICK = 0.5;        // px per ms that counts as a deliberate throw

export function attachSheet(panel, grip, { onOpen } = {}) {
  const phone = () => matchMedia(PHONE).matches;
  let startY = 0, startT = 0, lastY = 0, height = 0, peek = 0, dragging = false;

  const peekPx = () => parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--sheet-peek')) || 72;

  const setOpen = (open) => {
    document.body.classList.toggle('sheet-open', open);
    panel.style.transform = '';
    if (open) onOpen?.();
  };

  grip.addEventListener('pointerdown', (e) => {
    if (!phone()) return;
    dragging = true;
    height = panel.getBoundingClientRect().height;
    peek = peekPx();
    startY = lastY = e.clientY;
    startT = performance.now();
    grip.setPointerCapture(e.pointerId);
    document.body.classList.add('sheet-dragging');
  });

  grip.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    lastY = e.clientY;
    const open = document.body.classList.contains('sheet-open');
    const base = open ? 0 : height - peek;
    // Clamp so the sheet cannot be dragged past either end.
    const offset = Math.min(Math.max(base + (e.clientY - startY), 0), height - peek);
    panel.style.transform = `translateY(${offset}px)`;
  });

  const release = (e) => {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove('sheet-dragging');
    grip.releasePointerCapture?.(e.pointerId);

    const travel = lastY - startY;
    const speed = travel / Math.max(performance.now() - startT, 1);
    if (Math.abs(speed) > FLICK) {
      setOpen(speed < 0);                       // thrown up opens, down closes
    } else {
      const open = document.body.classList.contains('sheet-open');
      const base = open ? 0 : height - peek;
      setOpen(base + travel < (height - peek) / 2);
    }
  };
  grip.addEventListener('pointerup', release);
  grip.addEventListener('pointercancel', release);

  // A tap on the grip toggles, which is what most people try first.
  grip.addEventListener('click', () => {
    if (!phone()) return;
    if (Math.abs(lastY - startY) < 6) {
      setOpen(!document.body.classList.contains('sheet-open'));
    }
  });

  // Leaving phone width must not strand the sheet mid-drag.
  matchMedia(PHONE).addEventListener('change', () => {
    panel.style.transform = '';
    document.body.classList.remove('sheet-dragging');
  });

  return { open: () => setOpen(true), close: () => setOpen(false) };
}

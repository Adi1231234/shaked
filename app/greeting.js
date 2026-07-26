// The note she sees first.
//
// It waits for the model, so the face is already behind the card rather than
// a loading bar, and it holds focus while it is up so a keyboard or screen
// reader cannot wander into the viewer underneath.

export function showGreeting(onDismiss) {
  const overlay = document.getElementById('greeting');
  const button = document.getElementById('greeting-go');
  if (!overlay || !button) return;

  const previous = document.activeElement;
  overlay.hidden = false;
  // One frame in the hidden state first, or the transition never plays.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    overlay.classList.add('in');
    button.focus({ preventScroll: true });
  }));

  const dismiss = () => {
    overlay.classList.remove('in');
    const done = () => {
      overlay.hidden = true;
      overlay.removeEventListener('transitionend', done);
      previous?.focus?.({ preventScroll: true });
      onDismiss?.();
    };
    overlay.addEventListener('transitionend', done);
    // transitionend does not fire when motion is reduced away.
    setTimeout(done, 500);
    document.removeEventListener('keydown', onKey);
  };

  const onKey = (e) => {
    if (e.key === 'Escape' || e.key === 'Enter') dismiss();
    if (e.key === 'Tab') {          // only one control, so keep focus on it
      e.preventDefault();
      button.focus();
    }
  };

  button.addEventListener('click', dismiss, { once: true });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) dismiss();
  });
  document.addEventListener('keydown', onKey);
}

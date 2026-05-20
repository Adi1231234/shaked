// טוסט גלובלי קטן - הודעה צפה קצרה, בלי prop-drilling
let listener = null;

export function showToast(message) {
  if (listener) listener(message);
}

export function onToast(fn) {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}

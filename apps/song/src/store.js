// שמירה וטעינה של מצב מ-localStorage
const PREFIX = "dv-";

export function load(key, fallback) {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* localStorage לא זמין - מתעלמים */
  }
}

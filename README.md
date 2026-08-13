# לשקד

כל האתרים, התוספים והתוכנות שבניתי לשקד לאורך התואר ברפואה - מונורפו אחד, אתר אחד.

**האתר החי:** https://adi1231234.github.io/shaked/

עמוד הבית הוא רשת של קלפים - קלף לכל אתר / תוסף / תוכנה, עם צילום מסך אמיתי ושם המבחן שהוא נבנה בשבילו.

## מבנה

- `apps/hub/` - עמוד הבית עם הקלפים. זה מה שיושב בשורש האתר. `src/celebration/` הוא מסך הפתיחה: גשם של כובעי סיום על קנבס וברכת הסיום. הטקסט יושב ב-`overlay.js`, תערובת האימוג'ים בשורה אחת ב-`confetti.js`.
- `apps/` - כל האתרים. `limbs`, `head-neck`, `blood-vessels`, `good-luck`, `cv-onepage` הם HTML כתוב-ביד ומועתקים כמו שהם. `cv`, `ent-roadmap`, `song` נבנים ב-Vite.
- `extensions/complete-anatomy-quiz/` - תוסף Chrome. נארז ל-zip ישירות מ-git בזמן build.
- `desktop/shul-subtitles/` - אפליקציית Electron. לא חלק מה-workspace ולא נכנסת לאתר: היא נבנית ומופצת דרך GitHub Releases.
- `tools/vite-preset/` - הגדרת ה-Vite היחידה שכל האפליקציות חולקות.
- `tools/build/` - `site.mjs` מרכיב את `dist/`, `serve.mjs` מגיש אותו בדיוק כמו GitHub Pages.
- `docs/archive/` - ארטיפקטים ישנים ששווה לשמור.

## פקודות

```bash
npm install          # התקנה אחת לכל המונורפו
npm run build        # מרכיב את כל האתר לתוך dist/
npm run preview      # מגיש את dist/ על http://127.0.0.1:4173/shaked/
npm run dev:hub      # שרת פיתוח לעמוד הבית (וכן dev:cv, dev:ent-roadmap, dev:song)
```

## תשתית משותפת

React, Vite ו-TypeScript מוגדרים **פעם אחת** ב-`package.json` בשורש, ו-npm workspaces מרים אותם ל-`node_modules` אחד. אין עותק שני של React בעץ. כל `vite.config` באפליקציה הוא שלוש שורות שקוראות ל-`@shaked/vite-preset` ואומרות רק איפה האפליקציה מתפרסמת.

איחוד הגרסאות (React 18→19 ב-ent-roadmap, Vite 5/6→8) אומת מול הבילדים המקוריים: לכל אחת משלוש האפליקציות הושוו כל האלמנטים בעמוד - מיקום, גודל, צבע, רקע, פונט, משקל, רדיוס ושקיפות - **אפס הבדלים** (2559, 120 ו-369 אלמנטים בהתאמה).

## היסטוריה

תשעת הריפואים הנפרדים יובאו לכאן עם `git subtree` על כל ההיסטוריה שלהם, אז `git log` על כל תיקייה מראה את הקומיטים המקוריים. הענף `feat/head-neck-tabs` מחזיק עבודה על התוסף (גרסה 2.1.0, אזורי ראש-צוואר) שמעולם לא נדחפה לריפו הישן.

## מה לא נכנס לאתר

`apps/head-neck/photos/`, `capture/` ו-`vendor/` נשארים במחשב בלבד - זה תמונות של שקד והאטלסים המקוריים. הרשימה של מה שכן מתפרסם מוגדרת ב-`tools/build/targets.mjs`.

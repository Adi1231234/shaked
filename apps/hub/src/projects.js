// Everything built for Shaked, in the order it was built - `created` is the
// first commit in each project's history, and the list is kept sorted by it.
// `accent` is lifted from the real site each card points at, so the grid reads
// as a family portrait rather than a uniform template.

export const projects = [
  {
    id: 'blood-vessels',
    created: '2026-02-20',
    title: 'כלי דם',
    exam: 'מבחן כלי דם',
    blurb: 'כל העורקים והוורידים, מסודרים לפי ההרצאות - עורקים מול ורידים בלחיצה אחת.',
    kind: 'site',
    href: 'blood-vessels/',
    accent: '#e0574f',
  },
  {
    id: 'good-luck',
    created: '2026-02-22',
    title: 'בהצלחה',
    // Built for the blood-vessels exam - its last commit is literally
    // "vessels last ~11s", two days after the vessels diagram was finished.
    exam: 'מבחן כלי דם',
    blurb: 'עמוד אחד עם חלקיקים והודעה אחת: את הכי טובה בעולם.',
    kind: 'site',
    href: 'good-luck/',
    accent: '#ff2d95',
  },
  {
    id: 'ent-roadmap',
    created: '2026-04-12',
    title: 'מפת דרכים לאא"ג',
    exam: 'אחרי התואר',
    blurb: 'כל שלב בדרך להתמחות באף-אוזן-גרון, עם תאריכים ותוכניות, במקום אחד.',
    kind: 'site',
    href: 'ent-roadmap/',
    accent: '#fb7185',
  },
  {
    id: 'cv',
    created: '2026-04-24',
    title: 'קורות חיים',
    exam: 'הגשות מועמדות',
    blurb: 'אתר קורות חיים דו-לשוני עם כמה עיצובים להחלפה, מוכן להדפסה.',
    kind: 'site',
    href: 'cv/',
    accent: '#d4b887',
  },
  {
    id: 'limbs',
    created: '2026-05-02',
    title: 'אנטומיה של גפיים',
    exam: 'מבחן גפיים',
    blurb: 'מודל תלת-ממדי של הידיים והרגליים - עצמות, שרירים וכלי דם, שכבה אחר שכבה, עם חידון.',
    kind: 'site',
    href: 'limbs/',
    accent: '#7ee8ff',
  },
  {
    id: 'song',
    created: '2026-05-20',
    title: 'השיר',
    exam: 'שירים לפני המבחן',
    blurb: 'עמוד בסגנון Spotify עם שני שירים. נגן מלא, עטיפות, והכל בטלפון.',
    kind: 'site',
    href: 'song/',
    accent: '#1db954',
  },
  {
    id: 'shul-subtitles',
    created: '2026-06-10',
    title: 'שול · כתוביות',
    exam: 'הרצאות מוקלטות',
    blurb: 'תוכנת דסקטופ שמתמללת הרצאות ומדביקה עליהן כתוביות בעברית - הכל מקומי על המחשב.',
    kind: 'app',
    href: 'https://github.com/Adi1231234/shul-subtitles/releases/latest',
    action: 'הורדה',
    external: true,
    accent: '#6d7cf5',
  },
  {
    id: 'complete-anatomy-quiz',
    created: '2026-07-04',
    title: 'תוסף מבחן מוח',
    exam: 'מבחן מוח · Complete Anatomy',
    blurb: 'תוסף Chrome שנצמד ל-Complete Anatomy ומתשאל אותך בעברית על מבני המוח, מול המודל האמיתי.',
    kind: 'extension',
    href: 'downloads/complete-anatomy-quiz.zip',
    action: 'הורדה',
    accent: '#a78bfa',
  },
  {
    id: 'head-neck',
    created: '2026-07-26',
    title: 'ראש וצוואר',
    exam: 'מבחן ראש-צוואר',
    blurb: 'הפנים שלך כעור החיצוני של המודל. מקלפים מערכת אחרי מערכת ולוחצים על כל מבנה כדי לקבל את שמו.',
    kind: 'site',
    href: 'head-neck/',
    accent: '#ffc25c',
  },
];

export const kindLabels = {
  site: 'אתר',
  extension: 'תוסף Chrome',
  app: 'תוכנה למחשב',
};

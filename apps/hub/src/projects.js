// Everything built for Shaked, in the order it mattered during the degree.
// `accent` is lifted from the real site each card points at, so the grid reads
// as a family portrait rather than a uniform template.

export const projects = [
  {
    id: 'limbs',
    title: 'אנטומיה של גפיים',
    exam: 'מבחן גפיים',
    blurb: 'מודל תלת-ממדי של הידיים והרגליים - עצמות, שרירים וכלי דם, שכבה אחר שכבה, עם חידון.',
    kind: 'site',
    href: 'limbs/',
    accent: '#7ee8ff',
  },
  {
    id: 'head-neck',
    title: 'ראש וצוואר',
    exam: 'מבחן ראש-צוואר',
    blurb: 'הפנים שלה כעור החיצוני של המודל. מקלפים מערכת אחרי מערכת ולוחצים על כל מבנה כדי לקבל את שמו.',
    kind: 'site',
    href: 'head-neck/',
    accent: '#ffc25c',
  },
  {
    id: 'blood-vessels',
    title: 'כלי דם',
    exam: 'מבחן כלי דם',
    blurb: 'כל העורקים והוורידים, מסודרים לפי ההרצאות - עורקים מול ורידים בלחיצה אחת.',
    kind: 'site',
    href: 'blood-vessels/',
    accent: '#e0574f',
  },
  {
    id: 'complete-anatomy-quiz',
    title: 'תוסף מבחן מוח',
    exam: 'מבחן מוח · Complete Anatomy',
    blurb: 'תוסף Chrome שנצמד ל-Complete Anatomy ומתשאל אותה בעברית על מבני המוח, מול המודל האמיתי.',
    kind: 'extension',
    href: 'downloads/complete-anatomy-quiz.zip',
    action: 'הורדה',
    accent: '#a78bfa',
  },
  {
    id: 'shul-subtitles',
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
    id: 'ent-roadmap',
    title: 'מפת דרכים לאא"ג',
    exam: 'אחרי התואר',
    blurb: 'כל שלב בדרך להתמחות באף-אוזן-גרון, עם תאריכים ותוכניות, במקום אחד.',
    kind: 'site',
    href: 'ent-roadmap/',
    accent: '#fb7185',
  },
  {
    id: 'cv',
    title: 'קורות חיים',
    exam: 'הגשות מועמדות',
    blurb: 'אתר קורות חיים דו-לשוני עם כמה עיצובים להחלפה, מוכן להדפסה.',
    kind: 'site',
    href: 'cv/',
    accent: '#d4b887',
  },
  {
    id: 'song',
    title: 'השיר',
    exam: 'שירים לפני המבחן',
    blurb: 'עמוד בסגנון Spotify עם שני שירים. נגן מלא, עטיפות, והכל בטלפון.',
    kind: 'site',
    href: 'song/',
    accent: '#1db954',
  },
  {
    id: 'good-luck',
    title: 'בהצלחה',
    // Built for the blood-vessels exam - its last commit is literally
    // "vessels last ~11s", two days after the vessels diagram was finished.
    exam: 'מבחן כלי דם',
    blurb: 'עמוד אחד עם חלקיקים והודעה אחת: את הכי טובה בעולם.',
    kind: 'site',
    href: 'good-luck/',
    accent: '#ff2d95',
  },
];

export const kindLabels = {
  site: 'אתר',
  extension: 'תוסף Chrome',
  app: 'תוכנה למחשב',
};

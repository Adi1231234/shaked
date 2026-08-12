// What goes into the published site, and how each piece gets there.
//
// `bundled` apps run their own Vite build (base is set in their vite.config).
// `static` apps are hand-written HTML: they are copied verbatim, so their look
// and behaviour cannot drift. `include` keeps her photos and the upstream
// atlases out of the published site - they live in the repo, not on the web.

export const bundled = [
  { workspace: '@shaked/hub', out: '.' },
  { workspace: '@shaked/cv', out: 'cv' },
  { workspace: '@shaked/ent-roadmap', out: 'ent-roadmap' },
  { workspace: '@shaked/song', out: 'song' },
];

export const staticSites = [
  { dir: 'apps/limbs', out: 'limbs', include: ['index.html', 'quiz.html', 'models'] },
  { dir: 'apps/limbs-landing', out: 'limbs-landing', include: ['index.html'] },
  { dir: 'apps/head-neck', out: 'head-neck', include: ['index.html', 'app', 'models', 'data'] },
  { dir: 'apps/blood-vessels', out: 'blood-vessels', include: ['index.html'] },
  { dir: 'apps/good-luck', out: 'good-luck', include: ['index.html'] },
  { dir: 'apps/cv-onepage', out: 'cv-onepage', include: ['index.html'] },
];

// Zipped straight out of git, so the download is exactly what is committed.
export const downloads = [
  { treeish: 'HEAD:extensions/complete-anatomy-quiz', prefix: 'complete-anatomy-quiz/', file: 'complete-anatomy-quiz.zip' },
];

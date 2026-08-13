// What "the site is healthy" means, derived from the same lists the build uses
// so a new app is checked automatically and a deleted one stops being checked.

import { projects } from '../../apps/hub/src/projects.js';
import { bundled, downloads, staticSites } from '../build/targets.mjs';

/** Extra pages that are not a route of their own but must still work. */
const DEEP_LINKS = [
  { path: 'limbs/quiz.html', selector: 'canvas' },
  { path: 'head-neck/app/', selector: 'canvas' },
];

/** A page passes when this selector appears at least `min` times. */
const SELECTORS = {
  '': { selector: '.card', min: projects.length },
  'limbs/': { selector: 'canvas' },
  'head-neck/': { selector: 'canvas' },
  'blood-vessels/': { selector: '.tab-bar button', min: 2 },
  'good-luck/': { selector: 'canvas' },
  'cv/': { selector: '#root *', min: 20 },
  'ent-roadmap/': { selector: '#root *', min: 20 },
  'song/': { selector: '#root *', min: 20 },
};

export function routes() {
  const paths = [
    ...bundled.map((b) => (b.out === '.' ? '' : `${b.out}/`)),
    ...staticSites.map((s) => `${s.out}/`),
  ];

  const pages = paths.map((path) => ({
    path,
    ...(SELECTORS[path] ?? { selector: 'body' }),
  }));

  return [...pages, ...DEEP_LINKS];
}

/** Files that must be downloadable, with the bytes they have to start with. */
export function files() {
  return downloads.map((d) => ({ path: `downloads/${d.file}`, magic: 'PK' }));
}

/** Every card must point at something that exists. */
export function cardLinks() {
  return projects.filter((p) => !p.external).map((p) => p.href);
}

export const expectedCards = projects.length;

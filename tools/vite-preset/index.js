import react from '@vitejs/plugin-react';

/**
 * The one Vite setup every app in this monorepo shares.
 *
 * An app only says where it is deployed; the React plugin and the
 * dev-vs-build base switch live here so no app repeats them.
 *
 * @param {object} options
 * @param {string} options.base          deploy path, e.g. '/shaked/cv/'
 * @param {boolean} [options.withReact]  false for the plain-JS apps
 * @param {object} [options.overrides]   extra Vite config merged on top
 */
export function appConfig({ base, withReact = true, overrides = {} }) {
  return ({ command }) => ({
    // dev serves from the root; only the built site lives under a sub-path
    base: command === 'build' ? base : '/',
    plugins: withReact ? [react()] : [],
    ...overrides,
  });
}

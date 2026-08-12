// Assembles the whole published site into dist/.
//   npm run build
import { execFileSync } from 'node:child_process';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundled, downloads, staticSites } from './targets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dist = join(root, 'dist');

const run = (cmd, args) =>
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });

const step = (message) => console.log(`\n→ ${message}`);

async function buildBundled() {
  for (const { workspace, out } of bundled) {
    step(`building ${workspace}`);
    run('npm', ['run', 'build', '-w', workspace]);
    const from = join(root, workspaceDir(workspace), 'dist');
    await cp(from, join(dist, out), { recursive: true });
  }
}

function workspaceDir(workspace) {
  const name = workspace.replace('@shaked/', '');
  return join('apps', name);
}

async function copyStatic() {
  for (const { dir, out, include } of staticSites) {
    step(`copying ${dir}`);
    for (const entry of include) {
      await cp(join(root, dir, entry), join(dist, out, entry), { recursive: true });
    }
  }
}

async function packDownloads() {
  await mkdir(join(dist, 'downloads'), { recursive: true });
  for (const { treeish, prefix, file, paths = [] } of downloads) {
    step(`packing ${file}`);
    const out = join(dist, 'downloads', file);
    run('git', ['archive', '--format=zip', `--prefix=${prefix}`, '-o', out, treeish, ...paths]);
  }
}

step('clearing dist/');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await buildBundled();
await copyStatic();
await packDownloads();

// GitHub Pages must serve app/ and _-prefixed files untouched.
await writeFile(join(dist, '.nojekyll'), '');

console.log('\n✓ site assembled in dist/');

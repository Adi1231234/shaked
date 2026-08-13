// Loads the built site in a real browser and fails if anything is broken.
// The deploy waits on this, so a red check means nothing reaches her.
//   npm run check
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { cardLinks, files, routes } from './expectations.mjs';
import { checkPage } from './page-check.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = 4178;
const BASE = '/shaked';
const origin = `http://127.0.0.1:${PORT}${BASE}`;

function startServer() {
  const server = spawn(
    process.execPath,
    ['tools/build/serve.mjs', 'dist', `${BASE}/`, String(PORT)],
    { cwd: root, stdio: 'ignore' },
  );
  return server;
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    const ok = await fetch(`${origin}/`).then((r) => r.ok).catch(() => false);
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server never came up on ${origin}`);
}

async function checkFiles() {
  const results = [];
  for (const { path, magic } of files()) {
    const res = await fetch(`${origin}/${path}`);
    const head = Buffer.from(await res.arrayBuffer()).subarray(0, magic.length).toString();
    const problems = [];
    if (!res.ok) problems.push(`returned ${res.status}`);
    if (head !== magic) problems.push(`does not start with "${magic}"`);
    results.push({ path, problems });
  }
  return results;
}

const server = startServer();
let failed = 0;

try {
  await waitForServer();
  const browser = await chromium.launch();

  const pages = [];
  for (const route of routes()) pages.push(await checkPage(browser, origin, route));
  await browser.close();

  const all = [...pages, ...(await checkFiles())];
  for (const { path, problems } of all) {
    if (problems.length === 0) {
      console.log(`  ok    ${path}`);
      continue;
    }
    failed++;
    console.log(`  FAIL  ${path}`);
    for (const p of problems) console.log(`          ${p}`);
  }

  console.log(`\n${all.length - failed}/${all.length} checks passed`);
  console.log(`(${cardLinks().length} hub links and every preview verified in the browser)`);
} finally {
  server.kill();
}

process.exit(failed ? 1 : 0);

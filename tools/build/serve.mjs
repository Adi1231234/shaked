// Serves dist/ exactly the way GitHub Pages will - under /shaked/.
//   npm run preview
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// node tools/build/serve.mjs [root] [base] [port]
const [rootArg, baseArg, portArg] = process.argv.slice(2);
const dist = rootArg
  ? resolve(rootArg)
  : resolve(dirname(fileURLToPath(import.meta.url)), '../../dist');
const BASE = baseArg ?? '/shaked/';
const PORT = Number(portArg ?? 4173);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.zip': 'application/zip',
};

async function resolveFile(urlPath) {
  const rel = normalize(decodeURIComponent(urlPath.slice(BASE.length))).replace(/^(\.\.[/\\])+/, '');
  let file = join(dist, rel);
  const info = await stat(file).catch(() => null);
  if (info?.isDirectory()) file = join(file, 'index.html');
  return (await stat(file).catch(() => null)) ? file : null;
}

createServer(async (req, res) => {
  const urlPath = new URL(req.url, 'http://localhost').pathname;
  if (!urlPath.startsWith(BASE)) {
    res.writeHead(302, { location: BASE }).end();
    return;
  }
  const file = await resolveFile(urlPath);
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404');
    return;
  }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`serving dist/ at http://127.0.0.1:${PORT}${BASE}`);
});

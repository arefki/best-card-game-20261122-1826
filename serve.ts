// Development server for Emberfall Duel v2 (Node 22, standard library only).
//
// Serves game/ on http://localhost:8080 so the duel can be played and
// screenshotted in a desktop browser with no build step:
//   node serve.ts [--port 8080]
// Only files inside game/ are served; anything else gets a 404.

import { readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME_DIR = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const portArg = process.argv.indexOf('--port');
const port = portArg === -1 ? 8080 : Number(process.argv[portArg + 1]) || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function lookup(pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = resolve(join(GAME_DIR, rel));
  if (file !== GAME_DIR && !file.startsWith(GAME_DIR + sep)) return null;
  try {
    if (!statSync(file).isFile()) return null;
  } catch {
    return null;
  }
  return file;
}

createServer((req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  const file = lookup(path);
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    return;
  }
  const body = readFileSync(file);
  res.writeHead(200, {
    'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': body.length,
    'cache-control': 'no-store',
  });
  res.end(body);
}).listen(port, '127.0.0.1', () => {
  console.log(`Emberfall Duel v2 is on http://localhost:${port}`);
});

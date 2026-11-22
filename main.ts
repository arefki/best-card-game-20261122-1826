// Emberfall Duel — hand-in program (Node 22, standard library only).
//
// The game itself is static files under game/ plus four screenshots under
// screenshots/. This program copies both into the output directory and
// writes dossier.json — the summary the judge reads — with the vendored
// make.fun library, using the scorer's own caps. It runs twice in the
// grader and both runs must write identical bytes, so nothing here depends
// on the clock, the network, or the order the filesystem returns. The
// dossier is built from the copied files in the output directory, never
// from the repository directly, so the two runs agree byte for byte.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps for this bounty: at most 160 KiB of source text in the
// dossier, 4 screenshots of at most 256 KiB each, game/ at most 993 files
// and 48 MiB, no game path over 1,000 bytes.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function handIn() {
  mkdirSync(outDir, { recursive: true });
  cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
  const shotsOut = join(outDir, 'screenshots');
  mkdirSync(shotsOut, { recursive: true });
  const shotsIn = join(repoRoot, 'screenshots');
  if (existsSync(shotsIn)) cpSync(shotsIn, shotsOut, { recursive: true });
  writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, CAPS));
}

handIn();

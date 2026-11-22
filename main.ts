// Velvet Vault — the hand-in program.
// Copies game/ and screenshots/ to the output directory and writes the
// dossier the judge reads, using the kit's buildDossier. Standard library
// only; it runs twice and must write the same bytes both times.

import { copyFileSync, mkdirSync, readdirSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

function copyTree(src: string, dst: string): number {
  mkdirSync(dst, { recursive: true });
  let count = 0;
  for (const entry of readdirSync(src).sort()) {
    const from = join(src, entry);
    const to = join(dst, entry);
    if (statSync(from).isDirectory()) {
      count += copyTree(from, to);
    } else {
      copyFileSync(from, to);
      count += 1;
    }
  }
  return count;
}

const shots = readdirSync(join(REPO_ROOT, 'screenshots')).filter((n) => !n.startsWith('.'));
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shots.length}`);
}

const gameFiles = copyTree(join(REPO_ROOT, 'game'), join(OUT_DIR, 'game'));
const shotFiles = copyTree(join(REPO_ROOT, 'screenshots'), join(OUT_DIR, 'screenshots'));

const dossier = buildDossier(OUT_DIR, CAPS);
writeFileSync(join(OUT_DIR, 'dossier.json'), dossier);

// Verify what was written: the dossier must parse, name this schema, and
// carry every screenshot. A bad hand-in should fail loudly here, not at
// the gate.
const written = JSON.parse(readFileSync(join(OUT_DIR, 'dossier.json'), 'utf8')) as {
  schema: string;
  images: unknown[];
  text: string;
};
if (written.schema !== 'makefun/dossier/v1') throw new Error('dossier schema mismatch');
if (written.images.length !== shots.length) throw new Error('dossier image count mismatch');
if (written.text.length === 0) throw new Error('dossier holds no source text');
console.log(
  `Velvet Vault handed in: ${gameFiles} game files, ${shotFiles} screenshots, ` +
    `dossier ${dossier.length} bytes (${written.text.length} bytes of source text).`,
);

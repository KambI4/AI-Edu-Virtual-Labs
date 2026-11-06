// Сборка TS-модуля ядра для запуска в Node (используется tools/make-catalog.mjs и tools/check-i18n.mjs).
import { build } from 'rolldown';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const root = dirname(dirname(fileURLToPath(import.meta.url)));

export async function load(entry) {
  const dir = mkdtempSync(join(tmpdir(), 'vl-tool-'));
  const out = join(dir, 'entry.mjs');
  try {
    await build({ input: join(root, entry), platform: 'node', output: { file: out, format: 'esm' }, logLevel: 'silent' });
    return await import(pathToFileURL(out).href);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

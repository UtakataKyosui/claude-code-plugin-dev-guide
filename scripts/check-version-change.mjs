import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = process.argv[2];
const head = process.argv[3] ?? 'HEAD';
const relativeManifest = 'plugins/plugin-dev-guide/.claude-plugin/plugin.json';
assert.ok(base, 'Usage: node scripts/check-version-change.mjs <base> [head]');

const changed = execFileSync('git', ['diff', '--name-only', base, head], { cwd: root, encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);
if (!changed.some(file => file === 'plugins/plugin-dev-guide' || file.startsWith('plugins/plugin-dev-guide/'))) {
  console.log('No Plugin files changed; version bump is not required.');
  process.exit(0);
}

const current = JSON.parse(await readFile(path.join(root, relativeManifest), 'utf8')).version;
const previous = JSON.parse(execFileSync('git', ['show', `${base}:${relativeManifest}`], { cwd: root, encoding: 'utf8' })).version;
assert.notEqual(current, previous, `Plugin files changed but plugin.json version did not: ${previous}`);
console.log(`Plugin version changed: ${previous} -> ${current}`);

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const tag = process.argv[2];
const relativeManifest = 'plugins/plugin-dev-guide/.claude-plugin/plugin.json';
assert.ok(tag, 'Usage: node scripts/check-release-version.mjs <tag>');

const current = JSON.parse(await readFile(path.join(root, relativeManifest), 'utf8')).version;
const previous = JSON.parse(execFileSync('git', ['show', `${tag}^:${relativeManifest}`], { cwd: root, encoding: 'utf8' })).version;
assert.notEqual(current, previous, `Release commit did not change plugin.json version: ${previous}`);
console.log(`Release commit version changed: ${previous} -> ${current}`);

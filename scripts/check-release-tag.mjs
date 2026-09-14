import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const tag = process.argv[2];
assert.ok(tag, 'Usage: node scripts/check-release-tag.mjs <tag>');

const manifestPath = path.join(root, 'plugins/plugin-dev-guide/.claude-plugin/plugin.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const version = manifest.version;
assert.match(version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/, `Invalid Semantic Version: ${version}`);

const expected = `${manifest.name}--v${version}`;
assert.equal(tag, expected, `Release tag must be ${expected}; received ${tag}`);
console.log(`Release tag validated: ${tag} matches ${manifestPath}`);

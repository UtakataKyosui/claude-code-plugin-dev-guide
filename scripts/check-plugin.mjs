import assert from 'node:assert/strict';
import { readFile, readdir, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const json = async p => JSON.parse(await readFile(p, 'utf8'));
const catalog = await json(path.join(root, '.claude-plugin/marketplace.json'));
assert.equal(catalog.plugins.length, 1);
const entry = catalog.plugins[0];
const plugin = await realpath(path.resolve(root, entry.source));
assert.ok(plugin.startsWith(path.join(root, 'plugins') + path.sep));
const manifest = await json(path.join(plugin, '.claude-plugin/plugin.json'));
assert.equal(entry.name, manifest.name);

async function walk(dir) {
  const files = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    assert.ok(!item.isSymbolicLink(), `Unpackaged symlink: ${item.name}`);
    assert.ok(!['.git', '.jj', 'node_modules'].includes(item.name), `Local state: ${item.name}`);
    const full = path.join(dir, item.name);
    if (item.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}
const files = await walk(plugin);
const skills = files.filter(f => f.endsWith('/SKILL.md'));
assert.equal(skills.length, 2);
for (const file of skills) {
  const text = await readFile(file, 'utf8');
  assert.ok(text.startsWith('---\n'), `Missing frontmatter: ${file}`);
  assert.ok(/^description: .+/m.test(text), `Missing routing description: ${file}`);
  for (const match of text.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([\w./-]+)/g)) {
    const target = await realpath(path.resolve(plugin, match[1]));
    assert.ok(target.startsWith(plugin + path.sep), `Escaping reference: ${match[1]}`);
  }
}
for (const name of ['agent-skills.md', 'hooks.md', 'release-management.md', 'sub-agents.md']) {
  assert.equal(await readFile(path.join(plugin, 'references', name), 'utf8'),
    await readFile(path.join(root, 'docs', name), 'utf8'), `Out of sync: ${name}`);
}
console.log(`Package checks passed: ${skills.length} skills, 4 synchronized guides, all explicit skill references contained in plugin.`);

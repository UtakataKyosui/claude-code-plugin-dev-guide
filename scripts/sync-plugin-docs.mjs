import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const names = ['agent-skills.md', 'hooks.md', 'release-management.md', 'sub-agents.md'];
const check = process.argv.includes('--check');
const destination = path.join(root, 'plugins/plugin-dev-guide/references');
if (!check) await mkdir(destination, { recursive: true });
let different = false;
for (const name of names) {
  const source = await readFile(path.join(root, 'docs', name), 'utf8');
  const target = path.join(destination, name);
  if (check) {
    const current = await readFile(target, 'utf8').catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (current !== source) {
      console.error(`Out of sync: ${path.relative(root, target)}`);
      different = true;
    }
  } else {
    await writeFile(target, source);
  }
}
if (different) process.exitCode = 1;
else console.log(check ? 'Plugin references are in sync.' : `Synced ${names.length} reference documents.`);

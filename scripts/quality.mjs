import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
const scope = JSON.parse(readFileSync(new URL('../quality-scope.json', import.meta.url), 'utf8'));
const command = process.argv[2];
if (!['lint', 'format', 'format:check'].includes(command))
  throw new Error('Choose lint, format or format:check.');
const bin = command === 'lint' ? 'eslint/bin/eslint.js' : 'prettier/bin/prettier.cjs';
const args =
  command === 'lint'
    ? [...scope.typescript, ...scope.templates, ...scope.javascript, '--max-warnings', '0']
    : [command === 'format' ? '--write' : '--check', ...scope.format];
const result = spawnSync(
  process.execPath,
  [fileURLToPath(new URL('../node_modules/' + bin, import.meta.url)), ...args],
  { cwd: root, stdio: 'inherit', shell: false },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

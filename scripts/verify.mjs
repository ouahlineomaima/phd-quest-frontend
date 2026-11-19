import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const root = fileURLToPath(new URL('../', import.meta.url)),
  require = createRequire(import.meta.url);
const { assertRuntime } = require('./runtime.cjs');
const config = JSON.parse(readFileSync(new URL('../verification.json', import.meta.url), 'utf8'));
assertRuntime();
const args = process.argv.slice(2),
  noBuild = args.includes('--no-build'),
  suite = args.find((arg) => arg.startsWith('--suite='))?.slice(8);
const requested = args.filter((arg) => !arg.startsWith('--'));
if (args.some((arg) => arg.startsWith('--') && arg !== '--no-build' && !arg.startsWith('--suite=')))
  throw new Error(
    'Unknown option. Use build, lint, format, unit, integration, performance, browser, all; optionally --no-build or --suite=name.',
  );
let groups = requested.length ? requested : ['build', 'lint', 'format', 'unit'];
if (groups.includes('all')) groups = config.full;
groups = [...new Set(groups)];
for (const group of groups)
  if (!['build', 'lint', 'format', ...Object.keys(config.groups)].includes(group))
    throw new Error('Unknown verification group: ' + group);
const writing = groups.some((group) => config.databaseGroups.includes(group));
if (writing) {
  if (
    ['API_BASE_URL', 'PROGRESS_TEST_BASE_URL', 'RESEARCH_TEST_BASE_URL'].some(
      (key) => process.env[key],
    )
  )
    throw new Error('Remove external API URL overrides. Verification owns a private API.');
  if (!process.env.TEST_MONGODB_URI)
    throw new Error(
      'Explicit TEST_MONGODB_URI is required; use the test replica set and database name phd_quest_test. The application MONGODB_URI is ignored.',
    );
  const uri = new URL(process.env.TEST_MONGODB_URI);
  if (
    !['mongodb:', 'mongodb+srv:'].includes(uri.protocol) ||
    !/^phd_quest_(?:test|stage4_[a-f0-9]{32})$/.test(uri.pathname.slice(1)) ||
    uri.searchParams.has('dbName')
  )
    throw new Error(
      'TEST_MONGODB_URI must name phd_quest_test or a UUID stage4 database; production targets are refused.',
    );
}
const env = {
  ...process.env,
  NODE_ENV: 'test',
  MONGODB_URI: writing
    ? process.env.TEST_MONGODB_URI
    : 'mongodb://127.0.0.1:1/phd_quest_no_database',
  API_BASE_URL: '',
  PROGRESS_TEST_BASE_URL: '',
  RESEARCH_TEST_BASE_URL: '',
};
if (writing) {
  const smoke = new URL(process.env.TEST_MONGODB_URI);
  smoke.pathname = '/phd_quest_smoke_' + randomUUID().replaceAll('-', '');
  env.SMOKE_MONGODB_URI = smoke.toString();
}
function run(label, command) {
  console.log(`\n[verify] ${label} — Node ${process.versions.node}`);
  const result = spawnSync(process.execPath, command, {
    cwd: root,
    env,
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  console.log('[verify] PASS ' + label);
}
const needsBuild =
  !noBuild &&
  (groups.includes('build') ||
    (config.buildForTests && groups.some((group) => config.groups[group])));
if (needsBuild) run('build', config.build);
for (const group of groups) {
  if (group === 'build') continue;
  if (group === 'lint' || group === 'format') {
    run(group, ['scripts/quality.mjs', group === 'format' ? 'format:check' : 'lint']);
    continue;
  }
  let entry = config.groups[group];
  if (suite) {
    entry = config.suites[suite];
    if (!entry) throw new Error('Unknown suite: ' + suite);
    if (config.databaseSuites.includes(suite) && !writing)
      throw new Error('This suite requires the integration/browser group and TEST_MONGODB_URI.');
  }
  if (
    group === 'browser' &&
    config.frontendBuild &&
    !existsSync(fileURLToPath(new URL(config.frontendBuild, import.meta.url)))
  )
    throw new Error('Build the sibling frontend first: cd ../phd-quest-frontend && npm run build.');
  if (entry.tests?.length) run(group, ['--test', '--test-concurrency=2', ...entry.tests]);
  for (const command of entry.commands ?? []) run(group, command);
}

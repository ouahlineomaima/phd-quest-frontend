const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  Module = require('node:module'),
  ts = require('typescript');
const filename = path.resolve(__dirname, '../src/app/core/services/focus-timer-engine.ts'),
  compiled = new Module(filename, module);
compiled.filename = filename;
compiled.paths = module.paths;
compiled._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  filename,
);
const { elapsed, transition, parseTimer, timerText, STOPWATCH_LIMIT } = compiled.exports;
const snapshot = (mode = 'countdown') => ({
  version: 1,
  sessionId: '12345678-1234-4123-8123-123456789abc',
  kind: 'focus',
  mode,
  targetSeconds: mode === 'countdown' ? 60 : null,
  state: 'running',
  startedAt: 100,
  lastStartedAt: 100,
  accumulatedSeconds: 0,
  endedAt: null,
  taskRef: null,
});
test('timestamp accounting excludes pauses and survives serialized recovery', () => {
  let s = snapshot();
  s = transition(s, 'pause', 110);
  assert.equal(elapsed(s, 1000), 10);
  s = parseTimer(JSON.stringify(s));
  s = transition(s, 'resume', 1000);
  assert.equal(elapsed(s, 1010), 20);
  s = transition(s, 'finish', 1010);
  assert.equal(s.accumulatedSeconds, 20);
  assert.equal(s.endedAt, 1010);
  assert.equal(elapsed(s, 9999), 20);
});
test('background/closed countdown ends at its scheduled endpoint and caps at target', () => {
  const s = transition(parseTimer(JSON.stringify(snapshot())), 'finish', 99999);
  assert.equal(s.accumulatedSeconds, 60);
  assert.equal(s.endedAt, 160);
  assert.equal(s.state, 'finished');
  assert.deepEqual(transition(s, 'resume', 100000), s);
});
test('stopwatch handles hours, closure and the explicit seven-day cap', () => {
  const s = snapshot('stopwatch');
  assert.equal(timerText(elapsed(s, 7301)), '02:00:01');
  const done = transition(s, 'finish', 999999);
  assert.equal(done.accumulatedSeconds, STOPWATCH_LIMIT);
  assert.equal(done.endedAt, 100 + STOPWATCH_LIMIT);
});
test('pause at expiry finishes; zero-duration stops remain local and are not inflated', () => {
  assert.equal(transition(snapshot(), 'pause', 160).state, 'finished');
  assert.equal(transition(snapshot(), 'finish', 100).accumulatedSeconds, 0);
  assert.equal(timerText(0), '00:00');
});
test('invalid recovery snapshots are rejected instead of silently restarting', () => {
  for (const change of [
    { version: 2 },
    { accumulatedSeconds: -1 },
    { accumulatedSeconds: 61 },
    { sessionId: 'bad' },
    { targetSeconds: 61 },
    { state: 'invalid' },
    { kind: 'break', taskRef: '2026-11-15:a' },
    { state: 'paused', lastStartedAt: 100 },
  ])
    assert.throws(() => parseTimer(JSON.stringify({ ...snapshot(), ...change })));
  assert.equal(parseTimer(null), null);
});
test('short and long breaks use the same capped countdown accounting', () => {
  for (const target of [300, 900]) {
    const s = { ...snapshot(), kind: 'break', targetSeconds: target };
    const done = transition(parseTimer(JSON.stringify(s)), 'finish', 999999);
    assert.equal(done.accumulatedSeconds, target);
    assert.equal(done.endedAt, 100 + target);
  }
});

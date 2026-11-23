const { test } = require('node:test'),
  assert = require('node:assert/strict');
const fs = require('node:fs'),
  path = require('node:path'),
  Module = require('node:module'),
  ts = require('typescript');
require('@angular/compiler');
const { createEnvironmentInjector, Injector } = require('@angular/core');
const { of, throwError, Subject } = require('rxjs');
const { setImmediate } = require('node:timers');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '../src');
const original = Module._extensions['.ts'];
Module._extensions['.ts'] = (mod, file) => {
  if (!file.startsWith(root)) return original(mod, file);
  mod._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        experimentalDecorators: true,
      },
    }).outputText,
    file,
  );
};
const {
  displayedSeconds,
  elapsedSinceResponse,
} = require('../src/app/core/services/focus-timer-state.ts');
const { FocusTimer } = require('../src/app/core/services/focus-timer.service.ts');
const { FocusApi } = require('../src/app/core/services/focus-api.ts');
const stamp = '2026-11-23T12:00:00.000Z';
const row = (fields = {}) => ({
  sessionId: 'timer-one',
  mode: 'stopwatch',
  kind: 'focus',
  state: 'running',
  confirmedMilliseconds: 15000,
  elapsedMilliseconds: 18000,
  serverNow: stamp,
  leaseUntil: '2026-11-23T12:00:45.000Z',
  activityUntil: '2026-11-23T12:05:00.000Z',
  editVersion: 'version-one',
  ownerId: 'owner',
  ownerToken: 'token',
  heartbeatSequence: 1,
  focusedSeconds: 15,
  taskRef: '2026-11-22:task-one',
  taskTitle: 'Research task',
  ...fields,
});
test('three hours offline with expired legacy leases keeps the same timer running', async () => {
  let offline = false;
  const f = await fixture({
    current: () => (offline ? throwError(() => new Error('Offline')) : of(row())),
  });
  try {
    offline = true;
    await f.timer.refresh();
    f.timer.now.set(performance.now() + 10800000);
    assert.equal(f.timer.state(), 'running');
    assert.ok(f.timer.seconds() >= 10818);
    assert.equal(f.timer.snapshot().state, 'running');
    assert.match(f.timer.error(), /Running time continues/);
  } finally {
    f.destroy();
  }
});
test('a queued stop cannot target a replacement session returned by an in-flight read', async () => {
  let response = of(row());
  const f = await fixture({ current: () => response });
  try {
    const pending = new Subject();
    response = pending;
    const reading = f.timer.refresh();
    const stopping = f.timer.change('finish');
    pending.next(row({ sessionId: 'replacement', editVersion: 'replacement-version' }));
    pending.complete();
    await reading;
    await stopping;
    assert.equal(f.calls.length, 0);
    assert.equal(f.timer.snapshot().sessionId, 'replacement');
    assert.match(f.timer.error(), /changed while synchronizing/);
  } finally {
    f.destroy();
  }
});
test('running display interpolates server time without counting interval callbacks', () =>
  assert.equal(displayedSeconds(row(), 1100), 19));
test('paused display is frozen', () =>
  assert.equal(displayedSeconds(row({ state: 'paused' }), 10000), 15));
test('old heartbeat lease expiry does not truncate displayed time', () =>
  assert.equal(displayedSeconds(row(), 45000), 63));
test('interaction window expiry has no lifecycle or timing effect', () =>
  assert.equal(displayedSeconds(row({ activityUntil: stamp }), 1800000), 1818));
test('elapsed time continues beyond a countdown target', () =>
  assert.equal(displayedSeconds(row({ targetSeconds: 20 }), 20000), 38));
test('wake accounting includes sleep when the monotonic browser clock was suspended', () => {
  assert.equal(elapsedSinceResponse(50, 10800000), 10800000);
  assert.equal(elapsedSinceResponse(600000, -20000), 600000);
});
async function fixture(overrides = {}) {
  const entries = new Map();
  global.window = new globalThis.EventTarget();
  global.document = Object.assign(new globalThis.EventTarget(), { visibilityState: 'visible' });
  global.localStorage = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
      Object.defineProperty(global.localStorage, key, {
        value,
        configurable: true,
        enumerable: true,
      });
    },
    removeItem: (key) => {
      entries.delete(key);
      delete global.localStorage[key];
    },
  };
  Object.defineProperty(global, 'navigator', {
    configurable: true,
    value: { locks: { request: async (_name, _options, callback) => callback(null) } },
  });
  global.BroadcastChannel = undefined;
  let current = null;
  const calls = [];
  const api = {
    current: () => of(current),
    start: (input) => {
      calls.push(input);
      current = row(input);
      return of(current);
    },
    command: (session, action) => {
      calls.push(action);
      current = {
        ...session,
        state: action === 'stop' ? 'stopped' : action === 'pause' ? 'paused' : 'running',
      };
      return of(current);
    },
    ...overrides,
  };
  const injector = createEnvironmentInjector(
    [FocusTimer, { provide: FocusApi, useValue: api }],
    Injector.NULL,
  );
  const timer = injector.get(FocusTimer);
  await new Promise(setImmediate);
  return {
    timer,
    calls,
    update: (value) => {
      current = value;
    },
    destroy: () => injector.destroy(),
  };
}
test('Weekly Plan task reference and Focus standalone entry use the same server start', async () => {
  const f = await fixture();
  try {
    await f.timer.start('stopwatch', 25, '2026-11-22:task-one');
    assert.equal(f.calls[0].taskRef, '2026-11-22:task-one');
    await f.timer.change('finish');
    await f.timer.start('countdown', 25, null);
    assert.equal(f.calls[2].taskRef, null);
  } finally {
    f.destroy();
  }
});
test('one shared session prevents replacement and stays available across refresh/navigation', async () => {
  const f = await fixture();
  try {
    await f.timer.start('stopwatch', 25, null);
    await f.timer.refresh();
    await f.timer.start('stopwatch', 25, '2026-11-22:another');
    assert.equal(f.calls.length, 1);
    assert.match(f.timer.error(), /already exists/);
    assert.ok(f.timer.snapshot());
  } finally {
    f.destroy();
  }
});
test('pause/resume keep one session and stop hides the global timer while preserving history confirmation', async () => {
  const f = await fixture();
  try {
    await f.timer.start('stopwatch', 25, null);
    await f.timer.change('pause');
    assert.equal(f.timer.snapshot().state, 'paused');
    await f.timer.change('resume');
    assert.equal(f.timer.snapshot().state, 'running');
    await f.timer.change('finish');
    assert.equal(f.timer.snapshot(), null);
    assert.equal(f.timer.lastSaved().state, 'stopped');
  } finally {
    f.destroy();
  }
});
test('a change from another tab is reconciled from the server rather than local elapsed state', async () => {
  const f = await fixture();
  try {
    f.update(row({ state: 'paused', recovered: true }));
    await f.timer.refresh();
    assert.equal(f.timer.snapshot().recovered, true);
    assert.equal(f.timer.seconds(), 15);
    f.update(null);
    await f.timer.refresh();
    assert.equal(f.timer.snapshot(), null);
  } finally {
    f.destroy();
  }
});
test('command conflicts retain the current session and expose recovery feedback', async () => {
  const f = await fixture({ command: () => throwError(() => new Error('Stale timer version')) });
  try {
    await f.timer.start('stopwatch', 25, null);
    await f.timer.change('pause');
    assert.match(f.timer.error(), /Stale timer version/);
    assert.equal(f.timer.snapshot().state, 'running');
  } finally {
    f.destroy();
  }
});
test('a user command waits for an in-flight current read instead of dropping the action', async () => {
  const pending = new Subject();
  const f = await fixture({ current: () => pending });
  try {
    const work = f.timer.start('stopwatch', 25, null);
    assert.equal(f.timer.busy(), true);
    assert.equal(f.calls.length, 0);
    pending.next(null);
    pending.complete();
    await work;
    assert.equal(f.calls.length, 1);
    assert.equal(f.timer.snapshot().state, 'running');
  } finally {
    f.destroy();
  }
});
test('hiding, blurring, closing and destroying tabs never emit a timer mutation', async () => {
  const f = await fixture();
  try {
    f.update(row());
    await f.timer.refresh();
    global.document.visibilityState = 'hidden';
    global.document.dispatchEvent(new globalThis.Event('visibilitychange'));
    for (const name of ['blur', 'pagehide', 'beforeunload'])
      global.window.dispatchEvent(new globalThis.Event(name));
    assert.equal(f.timer.state(), 'running');
    assert.deepEqual(f.calls, []);
  } finally {
    f.destroy();
  }
  assert.deepEqual(f.calls, []);
});

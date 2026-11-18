const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  path = require('node:path'),
  Module = require('node:module'),
  ts = require('typescript');
require('@angular/compiler');
const { createEnvironmentInjector, Injector } = require('@angular/core');
const { of, Subject, throwError } = require('rxjs');
const { HttpErrorResponse } = require('@angular/common/http');
const root = path.resolve(__dirname, '../../src');
function load(relative) {
  return require(path.join(root, relative));
}
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
const { partitionMeetings, nextMeetingDelay, watchMeetingTime } = load(
  'app/features/supervisor-meetings/meeting-time-state.ts',
);
const { ReferenceOptions } = load('app/shared/state/reference-options.ts');
const { EditorFeedback } = load('app/shared/state/editor-feedback.ts');
const { ResearchApi } = load('app/core/services/research-api.ts');
const { SkillsFacade } = load('app/features/skills/skills-facade.ts');
const { MeetingsFacade } = load('app/features/supervisor-meetings/meetings-facade.ts');
const failure = () => throwError(() => new HttpErrorResponse({ status: 503 }));
function fixture(type, api = {}) {
  const injector = createEnvironmentInjector(
    [type, { provide: ResearchApi, useValue: api }],
    Injector.NULL,
  );
  return { state: injector.get(type), destroy: () => injector.destroy() };
}
const meeting = (id, at, status = 'scheduled') => ({ id, scheduledAt: at, status });
test('absolute meeting boundary retains equality then moves to reverse-ordered history', () => {
  const at = Date.parse('2026-11-18T23:59:00Z'),
    rows = [
      meeting('past', '2026-11-18T22:00:00Z'),
      meeting('soon', new Date(at).toISOString()),
      meeting('done', '2026-11-19T01:00:00Z', 'completed'),
    ];
  assert.deepEqual(
    partitionMeetings(rows, at).upcoming.map((m) => m.id),
    ['soon'],
  );
  assert.deepEqual(
    partitionMeetings(rows, at + 1).history.map((m) => m.id),
    ['done', 'soon', 'past'],
  );
  assert.equal(nextMeetingDelay(rows, at), 1);
  assert.equal(rows[0].id, 'past');
});
test('offset instants remain ordered through midnight and DST fallback without local conversion', () => {
  const rows = [
    meeting('first', '2026-11-01T01:30:00-04:00'),
    meeting('second', '2026-11-01T01:30:00-05:00'),
  ];
  assert.deepEqual(
    partitionMeetings(rows, Date.parse('2026-11-01T06:00:00Z')).upcoming.map((m) => m.id),
    ['second'],
  );
  assert.equal(
    nextMeetingDelay(
      [meeting('midnight', '2026-11-19T00:00:00+01:00')],
      Date.parse('2026-11-18T22:59:59Z'),
    ),
    1001,
  );
});
test('boundary scheduler uses bounded timers and cancels all work on destruction', () => {
  let now = 1000,
    callback,
    delay,
    active = false,
    clears = 0;
  const seen = [];
  const stop = watchMeetingTime(
    () => [meeting('a', new Date(1500).toISOString())],
    (at) => seen.push(at),
    {
      now: () => now,
      set: (work, ms) => {
        callback = work;
        delay = ms;
        active = true;
        return 9;
      },
      clear: (handle) => {
        assert.equal(handle, 9);
        clears++;
        active = false;
      },
    },
  );
  assert.equal(delay, 501);
  now = 1501;
  callback();
  assert.deepEqual(seen, [1000, 1501]);
  assert.equal(delay, 60000);
  stop();
  callback();
  assert.equal(active, false);
  assert.equal(clears, 1);
  assert.equal(seen.length, 2);
});
test('optional references cancel superseded reads, retain options on failure and retry independently', () => {
  const pending = new Subject(),
    callbacks = new Set();
  let calls = 0;
  const resource = new ReferenceOptions(
    () => (++calls === 1 ? of([{ id: 'kept' }]) : calls === 2 ? failure() : pending),
    {
      onDestroy: (work) => {
        callbacks.add(work);
        return () => callbacks.delete(work);
      },
    },
  );
  resource.load();
  assert.equal(resource.ready(), true);
  resource.load();
  assert.equal(resource.ready(), false);
  assert.deepEqual(resource.data(), [{ id: 'kept' }]);
  assert.ok(resource.error());
  resource.load();
  assert.equal(pending.observed, true);
  for (const stop of callbacks) stop();
  assert.equal(pending.observed, false);
});
test('Skill primary loading never requires optional resources and forwards captured versions unchanged', () => {
  let writes;
  const f = fixture(SkillsFacade, {
    skills: () => of({ categories: [], skills: [{ id: 'skill' }] }),
    change: (...args) => {
      writes = args;
      return of({});
    },
  });
  try {
    f.state.load();
    assert.equal(f.state.loaded(), true);
    assert.equal(f.state.tree().skills[0].id, 'skill');
    f.state.change('PATCH', 'skill', { name: 'draft' }, 'old-token').subscribe();
    assert.equal(writes[3], 'old-token');
  } finally {
    f.destroy();
  }
});
test('Meeting primary records survive summary/profile failures and recover without goal/roadmap reads', () => {
  const f = fixture(MeetingsFacade, {
    meetings: () => of({ timezone: 'Africa/Casablanca', items: [{ id: 'meeting' }] }),
    get: failure,
    supervisors: failure,
  });
  try {
    f.state.load(null, { archived: 'active', status: '', supervisorId: '' });
    f.state.profiles.load();
    assert.equal(f.state.loaded(), true);
    assert.equal(f.state.error(), '');
    assert.equal(f.state.meetings()[0].id, 'meeting');
    assert.ok(f.state.summaryError());
    assert.ok(f.state.profiles.error());
  } finally {
    f.destroy();
  }
});
test('conflict feedback preserves the draft, never retries a stale command, and discards only explicitly', () => {
  const f = fixture(EditorFeedback);
  let attempts = 0,
    discarded = 0;
  const draft = { notes: 'unsaved note' };
  try {
    f.state.save(
      () => {
        attempts++;
        return throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { code: 'STALE_RECORD', message: 'Changed' },
            }),
        );
      },
      draft,
      () => assert.fail('stale succeeded'),
      () => of({ notes: 'new server note' }),
      () => discarded++,
    );
    assert.equal(attempts, 1);
    assert.deepEqual(JSON.parse(f.state.conflictDraft()), draft);
    f.state.inspectLatest();
    assert.equal(JSON.parse(f.state.latestRecord()).notes, 'new server note');
    assert.equal(attempts, 1);
    assert.deepEqual(JSON.parse(f.state.conflictDraft()), draft);
    assert.equal(discarded, 0);
    f.state.discardDraft();
    assert.equal(discarded, 1);
    assert.equal(f.state.conflictDraft(), '');
  } finally {
    f.destroy();
  }
});
test('destroying feature state cancels its active request', () => {
  const pending = new Subject(),
    f = fixture(SkillsFacade, { skills: () => pending });
  f.state.load();
  assert.equal(pending.observed, true);
  f.destroy();
  assert.equal(pending.observed, false);
});

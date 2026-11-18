import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FocusApi, FocusSession } from './focus-api';
import { researchError } from './research-api';
import {
  elapsed,
  parseTimer,
  STOPWATCH_LIMIT,
  timerText,
  TimerSnapshot,
  transition,
} from './focus-timer-engine';
const KEY = 'phd-quest.focus.v1',
  LOCK = 'phd-quest.focus.timer';
@Injectable({ providedIn: 'root' })
export class FocusTimer {
  private readonly api = inject(FocusApi);
  readonly snapshot = signal<TimerSnapshot | null>(null);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly lastSaved = signal<FocusSession | null>(null);
  readonly now = signal(Math.floor(Date.now() / 1000));
  readonly seconds = computed(() => (this.snapshot() ? elapsed(this.snapshot()!, this.now()) : 0));
  readonly display = computed(() => {
    const s = this.snapshot();
    return timerText(
      s?.mode === 'countdown' ? Math.max(0, s.targetSeconds! - this.seconds()) : this.seconds(),
    );
  });
  readonly supported = !!navigator.locks;
  constructor() {
    this.read();
    window.addEventListener('storage', (event) => {
      if (event.key === KEY) {
        this.read();
        this.checkExpiry();
      }
    });
    setInterval(() => this.checkExpiry(), 250);
    queueMicrotask(() => this.checkExpiry());
  }
  private checkExpiry() {
    this.now.set(Math.floor(Date.now() / 1000));
    const s = this.snapshot();
    if (
      s?.state === 'running' &&
      this.seconds() >= (s.targetSeconds ?? STOPWATCH_LIMIT) &&
      !this.busy()
    )
      void this.change('finish');
  }
  private read() {
    try {
      const snapshot = parseTimer(localStorage.getItem(KEY));
      this.snapshot.set(snapshot);
      this.error.set('');
      return snapshot;
    } catch (error) {
      this.snapshot.set(null);
      this.error.set(
        error instanceof Error ? error.message : 'Timer recovery storage is unavailable.',
      );
      return undefined;
    }
  }
  private write(snapshot: TimerSnapshot | null) {
    if (snapshot) localStorage.setItem(KEY, JSON.stringify(snapshot));
    else localStorage.removeItem(KEY);
    this.snapshot.set(snapshot);
    this.now.set(Math.floor(Date.now() / 1000));
  }
  private async locked(work: (snapshot: TimerSnapshot | null) => Promise<void> | void) {
    if (this.busy()) return;
    if (!this.supported) {
      this.error.set(
        'Use PhD Quest on localhost in a browser that supports shared browser locks, such as Chrome or Edge.',
      );
      return;
    }
    this.busy.set(true);
    try {
      await navigator.locks.request(LOCK, async () => {
        const current = this.read();
        if (current !== undefined) await work(current);
      });
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'The timer action could not be confirmed.',
      );
    } finally {
      this.busy.set(false);
    }
  }
  async start(
    mode: 'countdown' | 'stopwatch',
    minutes: number,
    taskRef: string | null,
    kind: 'focus' | 'break' = 'focus',
  ) {
    await this.locked((current) => {
      if (current) {
        this.error.set('A timer already exists. Finish, save or discard it first.');
        return;
      }
      if (mode === 'countdown' && (!Number.isInteger(minutes) || minutes < 1 || minutes > 180))
        throw new Error('Choose a whole countdown duration from 1 to 180 minutes.');
      const now = Math.floor(Date.now() / 1000);
      this.lastSaved.set(null);
      this.write({
        version: 1,
        sessionId: crypto.randomUUID(),
        kind,
        mode,
        targetSeconds: mode === 'countdown' ? minutes * 60 : null,
        state: 'running',
        startedAt: now,
        lastStartedAt: now,
        accumulatedSeconds: 0,
        endedAt: null,
        taskRef: kind === 'break' ? null : taskRef,
      });
    });
  }
  async change(action: 'pause' | 'resume' | 'finish') {
    const expected = this.snapshot()?.sessionId;
    await this.locked((current) => {
      if (!current || current.sessionId !== expected) return;
      this.write(transition(current, action, Math.floor(Date.now() / 1000)));
    });
  }
  async discard() {
    const expected = this.snapshot()?.sessionId;
    await this.locked((current) => {
      if (current?.sessionId === expected) this.write(null);
    });
  }
  async clearInvalid() {
    if (!this.supported) return;
    try {
      await navigator.locks.request(LOCK, () => {
        try {
          parseTimer(localStorage.getItem(KEY));
          return;
        } catch {
          this.write(null);
          this.error.set('');
        }
      });
    } catch {
      this.error.set('Local storage is unavailable. Enable storage to recover a timer.');
    }
  }
  async save() {
    const expected = this.snapshot()?.sessionId;
    await this.locked(async (current) => {
      if (
        !current ||
        current.sessionId !== expected ||
        current.kind !== 'focus' ||
        current.state !== 'finished' ||
        current.accumulatedSeconds < 1
      )
        return;
      try {
        const result = await firstValueFrom(
          this.api.save({
            sessionId: current.sessionId,
            mode: current.mode,
            targetSeconds: current.targetSeconds,
            startedAt: new Date(current.startedAt * 1000).toISOString(),
            endedAt: new Date(current.endedAt! * 1000).toISOString(),
            focusedSeconds: current.accumulatedSeconds,
            taskRef: current.taskRef,
            completionType:
              current.mode === 'countdown' && current.accumulatedSeconds === current.targetSeconds
                ? 'target-reached'
                : 'stopped-early',
          }),
        );
        this.lastSaved.set(result);
        this.write(null);
      } catch (error) {
        this.error.set(
          researchError(error) +
            ' Your finished session remains available here; retrying uses the same session ID.',
        );
      }
    });
  }
}

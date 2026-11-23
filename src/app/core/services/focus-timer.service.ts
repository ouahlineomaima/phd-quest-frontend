import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ActiveFocusSession, FocusSession } from './focus-api';
import { FocusApi } from './focus-api';
import { researchError } from './research-api';
import type { TimerSnapshot } from './focus-timer-engine';
import { parseTimer, timerText } from './focus-timer-engine';
import { displayedSeconds, elapsedSinceResponse } from './focus-timer-state';
import { FocusMode } from '../../shared/models/domain.enums';

const LEGACY = 'phd-quest.focus.v1';
@Injectable({ providedIn: 'root' })
export class FocusTimer {
  private readonly api = inject(FocusApi);
  private readonly destroy = inject(DestroyRef);
  readonly tabId = crypto.randomUUID();
  readonly snapshot = signal<ActiveFocusSession | null>(null);
  readonly lastSaved = signal<FocusSession | null>(null);
  readonly legacy = signal<TimerSnapshot | null>(null);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly ready = signal(false);
  readonly supported = true; // Persistence and If-Match enforce concurrency without browser locks.
  readonly now = signal(performance.now());
  readonly wallNow = signal(Date.now());
  private receivedAt = performance.now();
  private receivedWall = Date.now();
  private syncing = false;
  private readonly channel =
    typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('phd-quest.focus');
  readonly seconds = computed(() => {
    const row = this.snapshot();
    return row
      ? displayedSeconds(
          row,
          elapsedSinceResponse(this.now() - this.receivedAt, this.wallNow() - this.receivedWall),
        )
      : 0;
  });
  readonly display = computed(() => {
    const row = this.snapshot();
    return timerText(
      row?.mode === FocusMode.Countdown
        ? Math.max(0, row.targetSeconds! - this.seconds())
        : this.seconds(),
    );
  });
  readonly elapsedDisplay = computed(() => timerText(this.seconds()));
  readonly state = computed(() => this.snapshot()?.state ?? 'idle');
  constructor() {
    try {
      this.legacy.set(parseTimer(localStorage.getItem(LEGACY)));
    } catch {
      this.error.set('A legacy local timer is invalid. Saved server history is unaffected.');
    }
    const returned = () => {
      this.updateClocks();
      void this.refresh();
    };
    const visibility = () => {
      if (document.visibilityState === 'visible') returned();
    };
    window.addEventListener('pageshow', returned);
    window.addEventListener('focus', returned);
    window.addEventListener('online', returned);
    document.addEventListener('visibilitychange', visibility);
    this.channel?.addEventListener('message', () => {
      void this.refresh();
    });
    const display = setInterval(() => this.updateClocks(), 500);
    const sync = setInterval(() => {
      void this.refresh();
    }, 15000);
    void this.refresh();
    this.destroy.onDestroy(() => {
      clearInterval(display);
      clearInterval(sync);
      this.channel?.close();
      window.removeEventListener('pageshow', returned);
      window.removeEventListener('focus', returned);
      window.removeEventListener('online', returned);
      document.removeEventListener('visibilitychange', visibility);
    });
  }
  private updateClocks() {
    this.now.set(performance.now());
    this.wallNow.set(Date.now());
  }
  private accept(row: ActiveFocusSession | null) {
    if (row?.state === 'stopped') {
      if (row.kind !== 'break') this.lastSaved.set(row);
      row = null;
    }
    this.receivedAt = performance.now();
    this.receivedWall = Date.now();
    this.updateClocks();
    this.snapshot.set(row);
  }
  async refresh() {
    if (this.syncing || this.busy()) return;
    this.syncing = true;
    try {
      this.accept(await firstValueFrom(this.api.current()));
      this.ready.set(true);
    } catch (error) {
      this.error.set(
        researchError(error) + ' Running time continues. Reconnect to synchronize with the server.',
      );
    } finally {
      this.syncing = false;
    }
  }
  private async action(work: () => Promise<void>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      while (this.syncing) await new Promise<void>((resolve) => setTimeout(resolve, 25));
      await work();
      this.channel?.postMessage('changed');
    } catch (error) {
      this.error.set(
        error instanceof Error && !('status' in error) ? error.message : researchError(error),
      );
      this.accept(await firstValueFrom(this.api.current()).catch(() => this.snapshot()));
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
    await this.action(async () => {
      if (this.snapshot())
        throw new Error(
          'A running or paused timer already exists. Open Focus to resume or stop it.',
        );
      if (mode === 'countdown' && (!Number.isInteger(minutes) || minutes < 1 || minutes > 180))
        throw new Error('Choose 1 to 180 whole minutes.');
      this.accept(
        await firstValueFrom(
          this.api.start({
            sessionId: crypto.randomUUID(),
            ownerId: this.tabId,
            mode,
            targetSeconds: mode === 'countdown' ? minutes * 60 : null,
            taskRef,
            kind,
          }),
        ),
      );
      this.lastSaved.set(null);
    });
  }
  async change(action: 'pause' | 'resume' | 'finish') {
    const intended = this.snapshot();
    if (!intended) return;
    await this.action(async () => {
      const row = this.snapshot();
      if (!row || row.sessionId !== intended.sessionId || row.editVersion !== intended.editVersion)
        throw new Error(
          'The timer changed while synchronizing. Review the current session before trying again.',
        );
      const saved = await firstValueFrom(
        this.api.command(row, action === 'finish' ? 'stop' : action, this.tabId),
      );
      if (saved.state === 'stopped') {
        this.accept(null);
        if (saved.kind !== 'break') this.lastSaved.set(saved);
      } else this.accept(saved);
    });
  }
  async saveLegacy() {
    await this.action(async () => {
      const row = this.legacy();
      if (!row || row.kind !== 'focus' || row.accumulatedSeconds < 1) return;
      const saved = await firstValueFrom(
        this.api.save({
          sessionId: row.sessionId,
          mode: row.mode,
          targetSeconds: row.targetSeconds,
          startedAt: new Date(row.startedAt * 1000).toISOString(),
          endedAt: new Date((row.endedAt ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
          focusedSeconds: row.accumulatedSeconds,
          taskRef: row.taskRef,
          completionType:
            row.mode === 'countdown' && row.accumulatedSeconds === row.targetSeconds
              ? 'target-reached'
              : 'stopped-early',
        }),
      );
      this.lastSaved.set(saved);
      this.clearInvalid();
    });
  }
  clearInvalid() {
    localStorage.removeItem(LEGACY);
    this.legacy.set(null);
    this.error.set('');
  }
}

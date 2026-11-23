import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ActiveFocusSession, FocusSession } from './focus-api';
import { FocusApi } from './focus-api';
import { researchError } from './research-api';
import type { TimerSnapshot } from './focus-timer-engine';
import { parseTimer, timerText } from './focus-timer-engine';
import { displayedSeconds, leaseExpired, otherTabsPresent } from './focus-timer-state';
import { FocusMode } from '../../shared/models/domain.enums';

const PRESENCE = 'phd-quest.focus.tab.',
  VISIBLE = 'phd-quest.focus.visible.',
  ACTIVITY = 'phd-quest.focus.activity',
  LEGACY = 'phd-quest.focus.v1',
  ACTIVITY_ACK = 'phd-quest.focus.activity-confirmed';
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
  readonly supported = !!navigator.locks;
  readonly now = signal(performance.now());
  private receivedAt = performance.now();
  private syncing = false;
  private leader = false;
  private electing = false;
  private releaseLeader?: () => void;
  private lastHeartbeat = 0;
  private acknowledgedActivity = 0;
  private readonly channel =
    typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('phd-quest.focus');
  readonly seconds = computed(() => {
    const row = this.snapshot();
    return row ? displayedSeconds(row, Math.max(0, this.now() - this.receivedAt)) : 0;
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
  readonly recoveryRequired = computed(() => {
    const row = this.snapshot();
    return (
      !!row &&
      row.state === 'running' &&
      leaseExpired(row, Math.max(0, this.now() - this.receivedAt))
    );
  });
  readonly state = computed(() =>
    this.recoveryRequired() ? 'paused' : (this.snapshot()?.state ?? 'idle'),
  );
  constructor() {
    try {
      this.legacy.set(parseTimer(localStorage.getItem(LEGACY)));
    } catch {
      this.error.set('A legacy local timer is invalid. Saved server history is unaffected.');
    }
    const activity = (event: Event) => {
      if (event.isTrusted) {
        try {
          localStorage.setItem(ACTIVITY, String(Date.now()));
        } catch {
          /* Lease remains bounded. */
        }
      }
    };
    const presence = () => {
      try {
        localStorage.setItem(PRESENCE + this.tabId, String(Date.now()));
        localStorage.setItem(VISIBLE + this.tabId, this.visible() ? String(Date.now()) : '0');
      } catch {
        /* Best effort. */
      }
    };
    const reopen = () => {
      presence();
      void this.refresh();
      this.elect();
    };
    const close = () => {
      try {
        localStorage.removeItem(PRESENCE + this.tabId);
        localStorage.removeItem(VISIBLE + this.tabId);
        const tabs = Object.keys(localStorage)
          .filter((key) => key.startsWith(PRESENCE))
          .map((key) => Number(localStorage.getItem(key)));
        const row = this.snapshot();
        if (row?.state === 'running' && !otherTabsPresent(tabs, Date.now())) {
          void fetch('/api/focus-sessions/' + encodeURIComponent(row.sessionId) + '/pause', {
            method: 'POST',
            keepalive: true,
            headers: {
              'Content-Type': 'application/json',
              'If-Match': '"' + row.editVersion + '"',
            },
            body: '{}',
          }).catch(() => undefined);
        }
      } catch {
        /* The server lease recovers at the last confirmed heartbeat. */
      }
      this.releaseLeader?.();
    };
    window.addEventListener('pointerdown', activity, true);
    window.addEventListener('keydown', activity, true);
    window.addEventListener('pagehide', close);
    window.addEventListener('pageshow', reopen);
    window.addEventListener('online', reopen);
    const visibility = () => {
      presence();
      this.yieldToVisiblePeer();
      this.elect();
      this.channel?.postMessage('visibility');
    };
    document.addEventListener('visibilitychange', visibility);
    this.channel?.addEventListener('message', () => {
      this.yieldToVisiblePeer();
      void this.refresh();
    });
    const display = setInterval(() => this.now.set(performance.now()), 250);
    const pulse = setInterval(() => {
      presence();
      this.yieldToVisiblePeer();
      this.elect();
      void this.pulse();
    }, 3000);
    presence();
    this.elect();
    void this.refresh();
    this.destroy.onDestroy(() => {
      clearInterval(display);
      clearInterval(pulse);
      close();
      this.channel?.close();
      window.removeEventListener('pointerdown', activity, true);
      window.removeEventListener('keydown', activity, true);
      window.removeEventListener('pagehide', close);
      window.removeEventListener('pageshow', reopen);
      window.removeEventListener('online', reopen);
      document.removeEventListener('visibilitychange', visibility);
    });
  }
  private accept(row: ActiveFocusSession | null) {
    if (row?.state === 'stopped') {
      if (row.kind !== 'break') this.lastSaved.set(row);
      row = null;
    }
    this.receivedAt = performance.now();
    this.now.set(this.receivedAt);
    this.snapshot.set(row);
  }
  async refresh() {
    if (this.syncing || this.busy()) return;
    this.syncing = true;
    try {
      this.accept(await firstValueFrom(this.api.current()));
      this.ready.set(true);
    } catch (error) {
      this.error.set(researchError(error) + ' Unconfirmed time is excluded if the lease expires.');
    } finally {
      this.syncing = false;
    }
  }
  private elect() {
    if (!this.supported || this.electing || this.leader) return;
    if (!this.visible() && this.visiblePeer()) return;
    this.electing = true;
    void navigator.locks
      .request('phd-quest.focus.owner', { ifAvailable: true }, async (lock) => {
        if (!lock) return;
        this.leader = true;
        await new Promise<void>((resolve) => {
          this.releaseLeader = resolve;
        });
        this.leader = false;
        this.releaseLeader = undefined;
      })
      .catch(() => this.error.set('Timer tab coordination is unavailable.'))
      .finally(() => {
        this.electing = false;
      });
  }
  private visible() {
    return typeof document === 'undefined' || document.visibilityState === 'visible';
  }
  private visiblePeer() {
    try {
      const now = Date.now();
      return Object.keys(localStorage)
        .filter((key) => key.startsWith(VISIBLE) && key !== VISIBLE + this.tabId)
        .some((key) => otherTabsPresent([Number(localStorage.getItem(key))], now));
    } catch {
      return false;
    }
  }
  private yieldToVisiblePeer() {
    if (this.leader && !this.visible() && this.visiblePeer()) this.releaseLeader?.();
  }
  private async pulse() {
    if (this.syncing || this.busy()) return;
    const row = this.snapshot();
    if (!this.leader || row?.state !== 'running') {
      await this.refresh();
      return;
    }
    if (performance.now() - this.lastHeartbeat < 15000 && row.ownerId === this.tabId) return;
    this.syncing = true;
    try {
      if (row.ownerId !== this.tabId) {
        this.accept(await firstValueFrom(this.api.command(row, 'claim', this.tabId)));
      } else {
        let activity = 0;
        try {
          activity = Number(localStorage.getItem(ACTIVITY));
        } catch {
          /* No fresh activity. */
        }
        this.accept(
          await firstValueFrom(
            this.api.heartbeat(
              row,
              this.tabId,
              activity >
                Math.max(this.acknowledgedActivity, Number(localStorage.getItem(ACTIVITY_ACK))),
            ),
          ),
        );
        this.acknowledgedActivity = activity;
        try {
          localStorage.setItem(ACTIVITY_ACK, String(activity));
        } catch {
          /* Server work window stays bounded. */
        }
      }
      this.lastHeartbeat = performance.now();
      this.channel?.postMessage('changed');
    } catch (error) {
      this.error.set(researchError(error) + ' Reload before resuming; expired time is not added.');
      this.accept(await firstValueFrom(this.api.current()).catch(() => this.snapshot()));
    } finally {
      this.syncing = false;
    }
  }
  private async action(work: () => Promise<void>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      // Finish the in-flight read/heartbeat before capturing the command's version.
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
      this.lastHeartbeat = performance.now();
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

import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Subscription } from 'rxjs';
import { timeout } from 'rxjs';
import { calendarDate, nextDateBoundary } from './gamification-calendar';
export interface GamificationSummary {
  totalXp: number;
  playerLevel: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  xpRemainingToNextLevel: number;
  levelProgressPercent: number;
  currentStreak: number;
  longestStreak: number;
  totalCompletedTasks: number;
  timezone: string;
  asOf: string;
  todayActivity: {
    date: string;
    taskCompletionCount: number;
    firstActivityAt: string | null;
    lastActivityAt: string | null;
  };
}
// Presentation only: streak counts and qualifying activity are supplied by the backend.
export function streakStatus(summary: GamificationSummary): string {
  return summary.todayActivity.taskCompletionCount > 0
    ? 'Active today'
    : summary.currentStreak > 0
      ? 'Continue today'
      : 'Start a streak';
}
@Injectable({ providedIn: 'root' })
export class GamificationState {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  private confirmedAt = 0;
  readonly summary = signal<GamificationSummary | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly streakStatus = computed(() => {
    const summary = this.summary();
    return summary ? streakStatus(summary) : null;
  });
  constructor() {
    this.refresh();
    effect((onCleanup) => {
      const summary = this.summary();
      if (!summary) return;
      const refreshIfStale = () => {
        if (
          !this.loading() &&
          (calendarDate(Date.now(), summary.timezone) !== summary.todayActivity.date ||
            Date.now() - this.confirmedAt >= 60000)
        )
          this.refresh();
      };
      const visible = () => {
        if (document.visibilityState === 'visible') refreshIfStale();
      };
      const timer = window.setTimeout(
        () => this.refresh(),
        nextDateBoundary(Date.now(), summary.timezone) - Date.now(),
      );
      window.addEventListener('focus', refreshIfStale);
      window.addEventListener('pageshow', refreshIfStale);
      window.addEventListener('online', refreshIfStale);
      document.addEventListener('visibilitychange', visible);
      onCleanup(() => {
        window.clearTimeout(timer);
        window.removeEventListener('focus', refreshIfStale);
        window.removeEventListener('pageshow', refreshIfStale);
        window.removeEventListener('online', refreshIfStale);
        document.removeEventListener('visibilitychange', visible);
      });
    });
  }
  accept(summary: GamificationSummary) {
    this.request?.unsubscribe();
    this.summary.set(summary);
    this.confirmedAt = Date.now();
    this.loading.set(false);
    this.error.set(false);
  }
  refresh() {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(false);
    this.request = this.http
      .get<GamificationSummary>('/api/gamification/summary')
      .pipe(timeout(15000), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => {
          this.summary.set(summary);
          this.confirmedAt = Date.now();
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }
}

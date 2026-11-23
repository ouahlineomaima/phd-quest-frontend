import type { ElementRef } from '@angular/core';
import { Component, DestroyRef, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Subscription } from 'rxjs';
import { forkJoin } from 'rxjs';
import { Badge, Card, EmptyState, Loading, PageHeader } from '../../shared/components/ui';
import { FocusTimer } from '../../core/services/focus-timer.service';
import type {
  ApplicationPreview,
  FocusHistory,
  FocusSession,
  FocusSummary,
} from '../../core/services/focus-api';
import { FocusApi } from '../../core/services/focus-api';
import { timerText } from '../../core/services/focus-timer-engine';
import { ResearchApi, researchError } from '../../core/services/research-api';
import type { SavedWeeklyPlan, WeekSummary } from '../weekly-plan/models/weekly-plan.models';
@Component({
  selector: 'pq-focus',
  standalone: true,
  imports: [Badge, Card, EmptyState, Loading, PageHeader],
  templateUrl: './focus.html',
  styleUrl: './focus.scss',
})
export class Focus {
  readonly timer = inject(FocusTimer);
  private readonly api = inject(FocusApi);
  private readonly research = inject(ResearchApi);
  private readonly destroy = inject(DestroyRef);
  readonly history = signal<FocusHistory | null>(null);
  readonly summary = signal<FocusSummary | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly weeks = signal<WeekSummary[]>([]);
  readonly plan = signal<SavedWeeklyPlan | null>(null);
  readonly taskError = signal('');
  readonly taskLoading = signal(false);
  readonly applying = signal(false);
  readonly preview = signal<ApplicationPreview | null>(null);
  readonly applyError = signal('');
  readonly message = signal('');
  readonly applicationDialog = viewChild<ElementRef<HTMLDialogElement>>('applicationDialog');
  effectiveMinutes = '';
  private presentedSession = '';
  mode: 'countdown' | 'stopwatch' = 'countdown';
  minutes = 25;
  week = '';
  taskRef = '';
  page = 1;
  private weekRequest?: Subscription;
  private historyRequest?: Subscription;
  readonly time = timerText;
  constructor() {
    this.load();
    this.loadWeeks();
    effect(() => {
      const saved = this.timer.lastSaved();
      if (saved) {
        this.page = 1;
        this.load();
        const dialog = this.applicationDialog()?.nativeElement;
        if (dialog && saved.sessionId !== this.presentedSession) {
          this.presentedSession = saved.sessionId;
          queueMicrotask(() => this.openApplication(saved, dialog));
        }
      }
    });
  }
  load() {
    this.historyRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.historyRequest = forkJoin({
      history: this.api.history(this.page),
      summary: this.api.summary(),
    })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          this.history.set(data.history);
          this.summary.set(data.summary);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.error.set(researchError(error));
        },
      });
  }
  loadWeeks() {
    this.taskLoading.set(true);
    this.taskError.set('');
    this.research
      .get<WeekSummary[]>('weekly-plans')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (weeks) => {
          this.weeks.set(weeks);
          this.taskLoading.set(false);
        },
        error: (error) => {
          this.taskLoading.set(false);
          this.taskError.set(researchError(error));
        },
      });
  }
  chooseWeek(id: string) {
    this.week = id;
    this.taskRef = '';
    this.plan.set(null);
    this.weekRequest?.unsubscribe();
    if (!id) {
      this.taskLoading.set(false);
      return;
    }
    this.taskLoading.set(true);
    this.taskError.set('');
    this.weekRequest = this.research
      .get<SavedWeeklyPlan>('weekly-plans/' + encodeURIComponent(id))
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (plan) => {
          this.plan.set(plan);
          this.taskLoading.set(false);
        },
        error: (error) => {
          this.taskLoading.set(false);
          this.taskError.set(researchError(error));
        },
      });
  }
  start() {
    void this.timer.start(this.mode, this.minutes, this.taskRef || null);
  }
  break(minutes: number) {
    void this.timer.start('countdown', minutes, null, 'break');
  }
  next(page: number) {
    this.page = page;
    this.load();
  }
  openApplication(session: FocusSession, dialog: HTMLDialogElement, keepDraft = false) {
    this.preview.set(null);
    this.applyError.set('');
    this.applying.set(true);
    if (!dialog.open) dialog.showModal();
    this.api
      .preview(session.sessionId)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (preview) => {
          this.preview.set(preview);
          if (!keepDraft) this.effectiveMinutes = String(preview.proposedMinutes);
          this.applying.set(false);
        },
        error: (error) => {
          this.applyError.set(researchError(error));
          this.applying.set(false);
        },
      });
  }
  apply(dialog: HTMLDialogElement) {
    const preview = this.preview();
    if (!preview || this.applying() || !this.validCorrection()) return;
    this.applying.set(true);
    this.applyError.set('');
    this.api
      .apply(
        preview.session.sessionId,
        Number(this.effectiveMinutes),
        preview.session.editVersion,
        preview.task?.manualActualMinutes,
      )
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.timer.lastSaved.set(null);
          this.applying.set(false);
          dialog.close();
          this.message.set(
            'Effective minutes added to task actual time exactly once. Completion, XP and streaks are unchanged.',
          );
          this.load();
        },
        error: (error) => {
          this.applying.set(false);
          this.applyError.set(
            researchError(error) + ' You can retry safely; a session is applied at most once.',
          );
        },
      });
  }
  validCorrection() {
    if (!/^\d+$/.test(this.effectiveMinutes) || Number(this.effectiveMinutes) > 1440) {
      this.applyError.set('Use whole effective minutes from 0 to 1,440.');
      return false;
    }
    return true;
  }
  saveWithoutApplying(dialog: HTMLDialogElement) {
    const preview = this.preview();
    if (!preview || this.applying() || !this.validCorrection()) return;
    this.applying.set(true);
    this.applyError.set('');
    this.api
      .correct(preview.session, Number(this.effectiveMinutes))
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.applying.set(false);
          dialog.close();
          this.timer.lastSaved.set(null);
          this.message.set('Session and correction saved without applying task time.');
          this.load();
        },
        error: (error) => {
          this.applying.set(false);
          this.applyError.set(
            researchError(error) +
              ' Your duration correction is retained. Inspect the latest record before retrying.',
          );
        },
      });
  }
  date(value: string | null) {
    if (!value) return 'No end date';
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: this.summary()?.timezone ?? 'Africa/Casablanca',
    }).format(new Date(value));
  }
  eligible(session: FocusSession) {
    return !session.appliedAt;
  }
}

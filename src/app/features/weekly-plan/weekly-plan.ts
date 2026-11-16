import { FocusApi } from '../../core/services/focus-api';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { Badge, Card, EmptyState, Loading, PageHeader, Progress, SectionHeading } from '../../shared/components/ui';
import { Icon } from '../../shared/components/icon/icon';
import { PlanTask } from './components/plan-task';
import { planError, WeeklyPlansApi } from './services/weekly-plans.service';
import { PlanError, ProgressSnapshot, SavedWeeklyPlan, TaskAction, WeekSummary, WeeklyProgress, weekDates } from './models/weekly-plan.models';
import { GamificationState } from '../../core/services/gamification.service';
import { ImportDialog } from './components/import-dialog';
@Component({ selector: 'pq-weekly-plan', standalone: true, imports: [Badge, Card, EmptyState, Loading, PageHeader, Progress, SectionHeading, Icon, PlanTask, ImportDialog], templateUrl: './weekly-plan.html', styleUrl: './weekly-plan.scss' })
export class WeeklyPlan {
  private readonly api = inject(WeeklyPlansApi); private readonly destroyRef = inject(DestroyRef);
  private readonly focusApi=inject(FocusApi);private focusRequest?:Subscription;
  readonly focusTimes=signal<Record<string,number>|null>(null);readonly focusError=signal(false);
  private listRequest?: Subscription; private detailRequest?: Subscription;
  readonly gamification = inject(GamificationState);
  readonly progress = signal<WeeklyProgress | null>(null); readonly busyTask = signal<string | null>(null); readonly message = signal(''); readonly xpAwarded = signal(0);
  readonly weeks = signal<WeekSummary[]>([]); readonly plan = signal<SavedWeeklyPlan | null>(null);
  readonly loading = signal(true); readonly detailLoading = signal(false); readonly error = signal<PlanError | null>(null);
  readonly selectedId = signal(''); readonly selected = signal(0);
  readonly importOpen = signal(false); readonly imported = signal(false);
  readonly dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  readonly dates = computed(() => this.plan() ? weekDates(this.plan()!.startDate) : []);
  readonly today = computed(() => this.gamification.summary()?.todayActivity.date ?? null);
  readonly todayIndex = computed(() => this.dates().indexOf(this.today() ?? ''));
  readonly currentWeek = computed(() => { const today = this.today(); return today ? this.weeks().find(week => week.startDate <= today && today <= week.endDate) : undefined; });
  readonly todayTasks = computed(() => this.todayIndex() < 0 ? [] : this.plan()?.tasks.filter(task => task.date === this.today()) ?? []);
  readonly todayCompleted = computed(() => this.todayTasks().filter(task => task.status === 'completed').length);
  readonly tasks = computed(() => this.plan()?.tasks.filter(task => task.date === this.dates()[this.selected()]) ?? []);
  readonly dayMinutes = computed(() => this.tasks().reduce((sum, task) => sum + task.estimatedMinutes, 0));
  readonly dayCompleted = computed(() => this.tasks().filter(task => task.status === 'completed').length);
  readonly totalMinutes = computed(() => this.plan()?.tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0) ?? 0);
  readonly potentialXp = computed(() => this.plan()?.tasks.reduce((sum, task) => sum + task.xpReward, 0) ?? 0);
  constructor() { this.loadWeeks(); }
  loadWeeks(preferredId?: string) {
    if (this.busyTask()) return;
    this.listRequest?.unsubscribe(); this.loading.set(true); this.error.set(null);
    this.listRequest = this.api.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: weeks => {
        this.weeks.set(weeks); this.loading.set(false);
        const id = weeks.find(week => week.id === (preferredId ?? this.selectedId()))?.id ?? this.currentWeek()?.id ?? weeks[0]?.id;
        if (id) this.selectWeek(id, this.plan()?.id === id);
        else { this.detailRequest?.unsubscribe(); this.detailLoading.set(false); this.plan.set(null); this.progress.set(null); this.selectedId.set(''); }
      }, error: error => { this.loading.set(false); this.error.set(planError(error)); },
    });
  }
  selectWeek(id: string, preserve = false) {
    if (this.busyTask()) return;
    this.message.set(''); this.xpAwarded.set(0);
    this.detailRequest?.unsubscribe(); this.selectedId.set(id); this.detailLoading.set(true); this.error.set(null);
    if (!preserve) { this.plan.set(null); this.progress.set(null); this.selected.set(0); }
    this.detailRequest = this.api.progress(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: snapshot => { this.accept(snapshot); if (!preserve) this.selected.set(Math.max(0, this.todayIndex())); this.detailLoading.set(false); },
      error: error => { this.detailLoading.set(false); this.error.set(planError(error)); },
    });
  }
  selectDay(index: number) {
    if (this.busyTask() || this.detailLoading() || index < 0 || index > 6) return;
    this.selected.set(index); this.message.set(''); this.xpAwarded.set(0);
  }
  jumpToToday() {
    if (this.loading() || this.detailLoading() || this.busyTask()) return;
    const week = this.currentWeek(); if (!week) return;
    if (this.plan()?.id !== week.id) this.selectWeek(week.id);
    else this.selectDay(this.todayIndex());
  }
  changeWeek(event: Event) { this.selectWeek((event.target as HTMLSelectElement).value); }
  onImported(plan: SavedWeeklyPlan) {
    this.detailRequest?.unsubscribe(); this.detailLoading.set(false); this.plan.set(plan); this.selectedId.set(plan.id); this.selected.set(Math.max(0, weekDates(plan.startDate).indexOf(this.today() ?? ''))); this.imported.set(true);
  }
  closeImport() { this.importOpen.set(false); this.loadWeeks(this.plan()?.id); }
  private accept(snapshot: ProgressSnapshot) { this.plan.set(snapshot.plan); this.progress.set(snapshot.weeklyProgress); this.gamification.accept(snapshot.gamification); this.readFocus(); }
  readFocus(){const plan=this.plan();if(!plan)return;this.focusRequest?.unsubscribe();this.focusTimes.set(null);this.focusError.set(false);this.focusRequest=this.focusApi.taskTimes(plan.weekId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:totals=>this.focusTimes.set(totals),error:()=>this.focusError.set(true)});}
  updateTask(event: TaskAction) {
    const plan = this.plan(); if (!plan || this.busyTask() || this.detailLoading()) return;
    this.busyTask.set(event.taskId); this.error.set(null); this.message.set(''); this.xpAwarded.set(0);
    this.api.change(plan.id, event).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.accept(response); this.busyTask.set(null);
        this.xpAwarded.set(response.changed && event.action === 'complete' && response.xpAwarded > 0 ? response.xpAwarded : 0);
        this.message.set(!response.changed ? 'Task was already in that state. No new XP or activity was recorded.' : event.action === 'reopen' ? 'Task reopened. Earned XP and historical activity are preserved.' : response.xpAwarded ? 'Task completed.' : 'Task completed. Activity recorded; no additional XP awarded.');
      }, error: error => { this.busyTask.set(null); this.error.set(planError(error)); },
    });
  }
}

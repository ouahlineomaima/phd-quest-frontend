import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { Badge, Card, EmptyState, Loading, PageHeader, SectionHeading } from '../../shared/components/ui';
import { Icon } from '../../shared/components/icon/icon';
import { PlanTask } from './components/plan-task';
import { planError, WeeklyPlansApi } from './services/weekly-plans.service';
import { PlanError, SavedWeeklyPlan, WeekSummary, weekDates } from './models/weekly-plan.models';
import { ImportDialog } from './components/import-dialog';
@Component({ selector: 'pq-weekly-plan', standalone: true, imports: [Badge, Card, EmptyState, Loading, PageHeader, SectionHeading, Icon, PlanTask, ImportDialog], templateUrl: './weekly-plan.html', styleUrl: './weekly-plan.scss' })
export class WeeklyPlan {
  private readonly api = inject(WeeklyPlansApi); private readonly destroyRef = inject(DestroyRef);
  private listRequest?: Subscription; private detailRequest?: Subscription;
  readonly weeks = signal<WeekSummary[]>([]); readonly plan = signal<SavedWeeklyPlan | null>(null);
  readonly loading = signal(true); readonly detailLoading = signal(false); readonly error = signal<PlanError | null>(null);
  readonly selectedId = signal(''); readonly selected = signal(0);
  readonly importOpen = signal(false); readonly imported = signal(false);
  readonly dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  readonly dates = computed(() => this.plan() ? weekDates(this.plan()!.startDate) : []);
  readonly tasks = computed(() => this.plan()?.tasks.filter(task => task.date === this.dates()[this.selected()]) ?? []);
  readonly dayMinutes = computed(() => this.tasks().reduce((sum, task) => sum + task.estimatedMinutes, 0));
  readonly totalMinutes = computed(() => this.plan()?.tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0) ?? 0);
  readonly potentialXp = computed(() => this.plan()?.tasks.reduce((sum, task) => sum + task.xpReward, 0) ?? 0);
  constructor() { this.loadWeeks(); }
  loadWeeks(preferredId?: string) {
    this.listRequest?.unsubscribe(); this.loading.set(true); this.error.set(null);
    this.listRequest = this.api.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: weeks => {
        this.weeks.set(weeks); this.loading.set(false);
        const id = weeks.find(week => week.id === (preferredId ?? this.selectedId()))?.id ?? weeks[0]?.id;
        if (id) { if (this.plan()?.id !== id) this.selectWeek(id); else this.selectedId.set(id); }
        else { this.detailRequest?.unsubscribe(); this.detailLoading.set(false); this.plan.set(null); this.selectedId.set(''); }
      }, error: error => { this.loading.set(false); this.error.set(planError(error)); },
    });
  }
  selectWeek(id: string) {
    this.detailRequest?.unsubscribe(); this.selectedId.set(id); this.detailLoading.set(true); this.error.set(null); this.plan.set(null); this.selected.set(0);
    this.detailRequest = this.api.detail(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: plan => { this.plan.set(plan); this.detailLoading.set(false); },
      error: error => { this.detailLoading.set(false); this.error.set(planError(error)); },
    });
  }
  changeWeek(event: Event) { this.selectWeek((event.target as HTMLSelectElement).value); }
  onImported(plan: SavedWeeklyPlan) {
    this.detailRequest?.unsubscribe(); this.detailLoading.set(false); this.plan.set(plan); this.selectedId.set(plan.id); this.selected.set(0); this.imported.set(true);
  }
  closeImport() { this.importOpen.set(false); this.loadWeeks(this.plan()?.id); }
}

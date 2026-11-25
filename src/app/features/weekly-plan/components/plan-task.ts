import { Component, DestroyRef, computed, effect, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Badge } from '../../../shared/components/ui';
import { Icon } from '../../../shared/components/icon/icon';
import type {
  PlanTaskInput,
  SavedTask,
  SavedWeeklyPlan,
  TaskAction,
} from '../models/weekly-plan.models';
import { planError, WeeklyPlansApi } from '../services/weekly-plans.service';
import { FocusTimer } from '../../../core/services/focus-timer.service';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { TaskStatus } from '../../../shared/models/domain.enums';

@Component({
  selector: 'pq-plan-task',
  standalone: true,
  imports: [Badge, Icon],
  templateUrl: './plan-task.html',
  styleUrl: './plan-task.scss',
})
export class PlanTask {
  readonly task = input.required<PlanTaskInput | SavedTask>();
  readonly focusedMinutes = input(0);
  readonly weekId = input('');
  readonly planId = input('');
  private readonly api = inject(WeeklyPlansApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly descriptionSaved = output<SavedWeeklyPlan>();
  readonly descriptionBusy = output<boolean>();
  readonly editingDescription = signal(false);
  readonly descriptionDraft = signal('');
  readonly descriptionError = signal('');
  readonly savingDescription = signal(false);
  readonly timer = inject(FocusTimer);
  private readonly router = inject(Router);
  async openTimer() {
    if (!this.timer.snapshot() && this.timer.ready())
      await this.timer.start('stopwatch', 25, this.weekId() + ':' + this.task().id);
    else if (this.timer.snapshot()?.taskRef !== this.weekId() + ':' + this.task().id)
      this.timer.error.set(
        'A running or paused session already exists. Resume it or explicitly stop it before starting another task.',
      );
    void this.router.navigate(['/focus']);
  }
  readonly interactive = input(false);
  readonly busy = input(false);
  readonly saving = input(false);
  readonly timezone = input('Africa/Casablanca');
  readonly requested = output<TaskAction>();
  readonly draft = signal('');
  readonly inputError = signal('');
  readonly saved = computed(() => {
    const task = this.task();
    return 'status' in task ? task : null;
  });
  readonly completed = computed(() => this.saved()?.status === TaskStatus.Completed);
  readonly status = computed(() =>
    this.saved() ? (this.completed() ? 'Completed' : 'Pending') : 'Pending on import',
  );
  private readonly taskState = computed(() => this.task().id + ':' + this.status());
  constructor() {
    effect(() => {
      this.taskState();
      this.draft.set('');
      this.inputError.set('');
    });
  }
  edit(event: Event) {
    this.draft.set((event.target as HTMLInputElement).value);
    this.inputError.set('');
  }
  editDescription() {
    if (!this.interactive() || this.busy() || !this.saved()) return;
    this.descriptionDraft.set(this.task().description ?? '');
    this.descriptionError.set('');
    this.editingDescription.set(true);
  }
  updateDescriptionDraft(event: Event) {
    this.descriptionDraft.set((event.target as HTMLTextAreaElement).value);
    this.descriptionError.set('');
  }
  cancelDescription() {
    if (!this.savingDescription()) this.editingDescription.set(false);
  }
  saveDescription(event: Event) {
    event.preventDefault();
    if (!this.interactive() || this.busy() || !this.saved() || !this.planId()) return;
    const description = this.descriptionDraft().trim();
    if (description.length > 2000) {
      this.descriptionError.set('Use up to 2,000 characters.');
      return;
    }
    this.savingDescription.set(true);
    this.descriptionBusy.emit(true);
    this.descriptionError.set('');
    this.api
      .updateDescription(this.planId(), this.task().id, description)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (plan) => {
          this.descriptionSaved.emit(plan);
          this.editingDescription.set(false);
          this.savingDescription.set(false);
          this.descriptionBusy.emit(false);
        },
        error: (error: unknown) => {
          this.descriptionError.set(planError(error).message);
          this.savingDescription.set(false);
          this.descriptionBusy.emit(false);
        },
      });
  }
  complete(event: Event) {
    event.preventDefault();
    if (!this.interactive() || this.busy() || this.completed()) return;
    const text = this.draft();
    const minutes = text === '' ? undefined : Number(text);
    if (
      minutes !== undefined &&
      (!/^\d+$/.test(text) || !Number.isInteger(minutes) || minutes < 0 || minutes > 1440)
    ) {
      this.inputError.set('Use whole minutes from 0 to 1,440, or leave blank.');
      return;
    }
    this.requested.emit({ taskId: this.task().id, action: 'complete', actualMinutes: minutes });
  }
  reopen() {
    if (this.interactive() && !this.busy() && this.completed())
      this.requested.emit({ taskId: this.task().id, action: 'reopen' });
  }
  completedTime(value: string) {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: this.timezone(),
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}

import { Component, computed, effect, input, output, signal } from '@angular/core';
import { Badge } from '../../../shared/components/ui';
import { Icon } from '../../../shared/components/icon/icon';
import type { PlanTaskInput, SavedTask, TaskAction } from '../models/weekly-plan.models';
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

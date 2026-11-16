import { Component, computed, effect, input, output, signal } from '@angular/core';
import { Badge } from '../../../shared/components/ui';
import { Icon } from '../../../shared/components/icon/icon';
import { PlanTaskInput, SavedTask, TaskAction } from '../models/weekly-plan.models';

@Component({ selector: 'pq-plan-task', standalone: true, imports: [Badge, Icon], templateUrl: './plan-task.html', styleUrl: './plan-task.scss' })
export class PlanTask {
  readonly task = input.required<PlanTaskInput | SavedTask>();
  readonly focusedMinutes = input(0);
  readonly interactive = input(false); readonly busy = input(false); readonly saving = input(false); readonly timezone = input('Africa/Casablanca');
  readonly requested = output<TaskAction>(); readonly draft = signal(''); readonly inputError = signal('');
  readonly saved = computed(() => { const task = this.task(); return 'status' in task ? task : null; });
  readonly completed = computed(() => this.saved()?.status === 'completed');
  readonly status = computed(() => this.saved() ? this.completed() ? 'Completed' : 'Pending' : 'Pending on import');
  private readonly taskState = computed(() => this.task().id + ':' + this.status());
  constructor() { effect(() => { this.taskState(); this.draft.set(''); this.inputError.set(''); }); }
  edit(event: Event) { this.draft.set((event.target as HTMLInputElement).value); this.inputError.set(''); }
  complete(event: Event) {
    event.preventDefault(); if (!this.interactive() || this.busy() || this.completed()) return;
    const text = this.draft(); const minutes = text === '' ? undefined : Number(text);
    if (minutes !== undefined && (!/^\d+$/.test(text) || !Number.isInteger(minutes) || minutes < 0 || minutes > 1440)) { this.inputError.set('Use whole minutes from 0 to 1,440, or leave blank.'); return; }
    this.requested.emit({ taskId: this.task().id, action: 'complete', actualMinutes: minutes });
  }
  reopen() { if (this.interactive() && !this.busy() && this.completed()) this.requested.emit({ taskId: this.task().id, action: 'reopen' }); }
  completedTime(value: string) { return new Intl.DateTimeFormat(undefined, { timeZone: this.timezone(), dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
}

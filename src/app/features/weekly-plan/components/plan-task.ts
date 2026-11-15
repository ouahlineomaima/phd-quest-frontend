import { Component, computed, input } from '@angular/core';
import { Badge } from '../../../shared/components/ui';
import { Icon } from '../../../shared/components/icon/icon';
import { PlanTaskInput, SavedTask } from '../models/weekly-plan.models';

@Component({
  selector: 'pq-plan-task', standalone: true, imports: [Badge, Icon],
  template: `<article><div class="row spread wrap"><div class="row wrap"><pq-badge [tone]="task().priority === 'high' ? 'gold' : 'primary'">{{ task().priority }} priority</pq-badge><pq-badge tone="muted">{{ task().isOptional ? 'Optional' : 'Mandatory' }}</pq-badge></div><span class="status">{{ status() }}</span></div><h3>{{ task().title }}</h3>@if (task().description) { <p class="description">{{ task().description }}</p> }<div class="task-meta"><span><pq-icon name="clock" />{{ task().estimatedMinutes }} min estimated</span><span class="gold"><pq-icon name="sparkles" />{{ task().xpReward }} potential XP</span></div><div class="deliverable"><pq-icon name="book" /><div><span>Expected deliverable</span><p>{{ task().deliverable }}</p></div></div><div class="row spread wrap task-bottom"><code>{{ task().id }}</code><button class="button" disabled>Completion in Phase 5</button></div></article>`,
  styles: [':host{display:block}article{border:1px solid var(--border);border-radius:12px;padding:18px;background:var(--background)}h3{font-size:15px;margin:16px 0 9px;overflow-wrap:anywhere}.status{font-size:10px;color:var(--muted)}.description{white-space:pre-wrap;color:var(--muted);font-size:12px;line-height:1.8;overflow-wrap:anywhere}.task-meta{display:flex;flex-wrap:wrap;gap:16px;margin:17px 0;font-size:11px;color:var(--muted)}.task-meta>span{display:flex;align-items:center;gap:6px}pq-icon{width:15px;height:15px}.deliverable{display:flex;gap:9px;align-items:flex-start;border-top:1px solid var(--border);padding-top:14px}.deliverable>pq-icon{color:var(--accent);margin-top:3px}.deliverable span{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}.deliverable p{font-size:12px;margin-top:4px;overflow-wrap:anywhere}.task-bottom{margin-top:15px}code{font-size:9px;color:var(--muted);overflow-wrap:anywhere}.button{min-height:32px;font-size:9px;padding:6px 9px}'],
})
export class PlanTask {
  readonly task = input.required<PlanTaskInput | SavedTask>();
  readonly status = computed(() => { const task = this.task(); return 'status' in task ? task.status === 'completed' ? 'Completed' : 'Pending' : 'Pending on import'; });
}

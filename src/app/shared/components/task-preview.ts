import { Component, input } from '@angular/core';
import { Badge } from './ui';
import { TaskPreview as TaskView } from '../models/preview.models';

@Component({
  selector: 'pq-task-preview',
  standalone: true,
  imports: [Badge],
  template: `<span class="task-marker" aria-hidden="true"></span>
    <div class="task-content">
      <h3>{{ task().title }}</h3>
      <p>{{ task().project }} <span>·</span> {{ task().duration }}</p>
    </div>
    <pq-badge [tone]="task().tone">{{ task().category }}</pq-badge>`,
  styles: [
    ':host{display:flex;align-items:center;gap:14px;padding:20px 0;border-bottom:1px solid var(--border)}:host:last-child{border-bottom:0}.task-marker{width:17px;height:17px;border:1.5px solid var(--border);border-radius:5px;flex-shrink:0}.task-content{flex:1;min-width:0}h3{font-family:Inter,sans-serif;font-size:11px;font-weight:500;line-height:1.6;letter-spacing:0}p{font-size:10px;color:var(--muted);margin-top:5px}p span{padding:0 5px}@media(max-width:500px){:host{flex-wrap:wrap;gap:10px}.task-content{flex-basis:calc(100% - 35px)}pq-badge{margin-left:27px}}',
  ],
})
export class TaskPreviewComponent {
  readonly task = input.required<TaskView>();
}

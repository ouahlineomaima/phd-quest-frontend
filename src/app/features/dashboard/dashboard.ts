import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge, Card, PageHeader, Progress, Ring, SectionHeading, Stat } from '../../shared/components/ui';
import { Icon } from '../../shared/components/icon/icon';
import { TaskPreviewComponent } from '../../shared/components/task-preview';
import { PREVIEW_FOCUS, PREVIEW_GOALS, PREVIEW_METRICS, PREVIEW_TASKS, PREVIEW_SUMMARY, PREVIEW_LEVELS } from '../../core/demo/preview-data';
@Component({ selector: 'pq-dashboard', standalone: true, imports: [RouterLink, Badge, Card, PageHeader, Progress, Ring, SectionHeading, Stat, Icon, TaskPreviewComponent], templateUrl: './dashboard.html', styleUrl: './dashboard.scss' })
export class Dashboard {
  readonly metrics = PREVIEW_METRICS; readonly tasks = PREVIEW_TASKS; readonly focus = PREVIEW_FOCUS; readonly goals = PREVIEW_GOALS;
  readonly preview = PREVIEW_SUMMARY; readonly chapter = PREVIEW_LEVELS[3];
  readonly days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
}

import { Component, computed, signal } from '@angular/core';
import { Badge, Card, EmptyState, PageHeader, Progress, SectionHeading } from '../../shared/components/ui';
import { Icon } from '../../shared/components/icon/icon';
import { TaskPreviewComponent } from '../../shared/components/task-preview';
import { PREVIEW_DAYS, PREVIEW_DELIVERABLES, PREVIEW_OBJECTIVES } from '../../core/demo/preview-data';
@Component({ selector: 'pq-weekly-plan', standalone: true, imports: [Badge, Card, EmptyState, PageHeader, Progress, SectionHeading, Icon, TaskPreviewComponent], templateUrl: './weekly-plan.html', styleUrl: './weekly-plan.scss' })
export class WeeklyPlan {
  readonly days = PREVIEW_DAYS; readonly objectives = PREVIEW_OBJECTIVES; readonly deliverables = PREVIEW_DELIVERABLES;
  readonly selected = signal(1); readonly day = computed(() => this.days[this.selected()]);
}

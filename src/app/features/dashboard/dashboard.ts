import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge, Card, PageHeader, Progress, Ring, SectionHeading, Stat } from '../../shared/components/ui';
import { Icon } from '../../shared/components/icon/icon';
import { TaskPreviewComponent } from '../../shared/components/task-preview';
import { PREVIEW_FOCUS, PREVIEW_GOALS, PREVIEW_METRICS, PREVIEW_TASKS, PREVIEW_SUMMARY, PREVIEW_LEVELS } from '../../core/demo/preview-data';
import { GamificationState } from '../../core/services/gamification.service';
import { MetricPreview } from '../../shared/models/preview.models';
@Component({ selector: 'pq-dashboard', standalone: true, imports: [RouterLink, Badge, Card, PageHeader, Progress, Ring, SectionHeading, Stat, Icon, TaskPreviewComponent], templateUrl: './dashboard.html', styleUrl: './dashboard.scss' })
export class Dashboard {
  readonly gamification = inject(GamificationState);
  readonly metrics = computed<readonly MetricPreview[]>(() => {
    const player = this.gamification.summary();
    return [
      { label: 'Player level · live', value: player ? String(player.playerLevel) : '—', note: player ? `${player.totalXp} earned XP · ${player.xpRemainingToNextLevel} XP to next level` : 'Player progress unavailable', icon: 'sparkles', tone: 'primary' },
      { label: 'Daily streak · live', value: player ? `${player.currentStreak} days` : '—', note: player ? `Best ${player.longestStreak} days · ${player.timezone}` : 'Waiting for real activity data', icon: 'flame', tone: 'gold' },
      { ...PREVIEW_METRICS[2], label: 'Weekly progress · demo' }, { ...PREVIEW_METRICS[3], label: 'Weekly workload · demo' },
    ];
  });
  readonly tasks = PREVIEW_TASKS; readonly focus = PREVIEW_FOCUS; readonly goals = PREVIEW_GOALS;
  readonly preview = PREVIEW_SUMMARY; readonly chapter = PREVIEW_LEVELS[3];
  readonly days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
}

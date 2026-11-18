import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge, Card } from '../../shared/components/ui';
import { ActionCard } from './action-card';
import { MeetingActionStatus } from '../../shared/models/domain.enums';
import type { Meeting, MeetingAction } from './meeting.models';
@Component({
  selector: 'pq-meeting-detail',
  standalone: true,
  imports: [RouterLink, Badge, Card, ActionCard],
  templateUrl: './meeting-detail.html',
  styleUrl: './supervisor-meetings.scss',
})
export class MeetingDetail {
  readonly meeting = input.required<Meeting>();
  readonly timezone = input.required<string>();
  readonly busy = input(false);
  readonly edit = output<void>();
  readonly statusChanged = output<string>();
  readonly archive = output<void>();
  readonly addAction = output<string>();
  readonly editAction = output<MeetingAction>();
  readonly removeAction = output<MeetingAction>();
  readonly noteSections = [
    ['agenda', 'Agenda'],
    ['discussion', 'Discussion notes'],
    ['feedback', 'Supervisor feedback'],
    ['decisions', 'Decisions'],
  ] as const;
  readonly phases = ['pre_meeting', 'post_meeting'] as const;
  count(phase: string): string {
    const actions = this.phaseActions(phase);
    return (
      actions.filter((a) => a.status === MeetingActionStatus.Completed).length +
      ' / ' +
      actions.length +
      ' manually completed'
    );
  }
  phaseActions(phase: string): MeetingAction[] {
    return this.meeting().actions.filter((a) => String(a.phase) === phase);
  }
}

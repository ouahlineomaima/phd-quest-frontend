import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Card, Loading } from '../../shared/components/ui';
import { ResearchApi, researchError } from '../../core/services/research-api';
import { MeetingSummary } from './meeting.models';
@Component({
  selector: 'pq-meeting-summary',
  standalone: true,
  imports: [Card, Loading, RouterLink],
  template: `<pq-card
    ><div class="row spread wrap">
      <h2>Supervisor meetings</h2>
      <a class="text-link" routerLink="/supervisor-meetings">Manage meetings</a>
    </div>
    @if (loading()) {
      <pq-loading label="Loading meeting summary" />
    } @else if (error()) {
      <p role="alert">{{ error() }}</p>
      <button class="button" (click)="load()">Retry meeting summary</button>
    } @else if (data(); as summary) {
      @if (summary.nextMeeting; as meeting) {
        <a class="next text-link" [routerLink]="['/supervisor-meetings', meeting.id]">{{
          meeting.title
        }}</a>
        <p class="muted small">{{ meeting.scheduledLabel }} / {{ summary.timezone }}</p>
      } @else {
        <p class="muted next">No upcoming meeting. Schedule your next research conversation.</p>
      }
      <div class="counts">
        <span
          ><strong>{{ summary.preparation }}</strong> open preparation</span
        ><span
          ><strong>{{ summary.followUp }}</strong> open follow-up</span
        ><span
          ><strong>{{ summary.overdue }}</strong> overdue</span
        >
      </div>
    }
  </pq-card>`,
  styles: [
    `
      :host {
        display: block;
      }
      .next {
        margin-top: 18px;
      }
      .counts {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        margin-top: 18px;
        font-size: 12px;
        color: var(--muted);
      }
      strong {
        color: var(--text);
      }
    `,
  ],
})
export class MeetingSummaryCard {
  private readonly api = inject(ResearchApi);
  private readonly destroy = inject(DestroyRef);
  readonly data = signal<MeetingSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.api
      .get<MeetingSummary>('supervisor-meetings/summary')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          this.data.set(data);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(researchError(e));
          this.loading.set(false);
        },
      });
  }
  time(value: string, timezone: string) {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}

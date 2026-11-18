import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Badge, Card, EmptyState, Loading, PageHeader } from '../../shared/components/ui';
import { StaleConflict } from '../../shared/components/stale-conflict';
import { ReferenceStatusNotice } from '../../shared/components/reference-status';
import { EditorFeedback } from '../../shared/state/editor-feedback';
import { ResearchReferences } from '../../shared/state/research-references';
import { MeetingsFacade } from './meetings-facade';
import { MeetingClock } from './meeting-clock';
import { partitionMeetings } from './meeting-time-state';
import { MeetingDetail } from './meeting-detail';
import { MeetingEditors } from './meeting-editors';
import { ActionCard } from './action-card';
@Component({
  selector: 'pq-supervisor-meetings',
  standalone: true,
  providers: [MeetingsFacade, EditorFeedback, ResearchReferences, MeetingClock],
  imports: [
    RouterLink,
    Badge,
    Card,
    EmptyState,
    Loading,
    PageHeader,
    StaleConflict,
    ReferenceStatusNotice,
    ActionCard,
    MeetingDetail,
    MeetingEditors,
  ],
  templateUrl: './supervisor-meetings.html',
  styleUrl: './supervisor-meetings.scss',
})
export class SupervisorMeetings {
  readonly state = inject(MeetingsFacade);
  readonly feedback = inject(EditorFeedback);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  private readonly clock = inject(MeetingClock);
  readonly loading = this.state.loading;
  readonly busy = computed(() => this.feedback.busy() || this.loading());
  readonly error = computed(() => this.state.error() || this.feedback.error());
  readonly success = this.feedback.success;
  readonly conflictDraft = this.feedback.conflictDraft;
  readonly latestRecord = this.feedback.latestRecord;
  readonly supervisors = this.state.supervisors;
  readonly meetings = this.state.meetings;
  readonly current = this.state.current;
  readonly summary = this.state.summary;
  readonly actions = this.state.actions;
  readonly supervisorArchive = signal('active');
  readonly shownSupervisors = computed(() =>
    this.supervisors().filter(
      (s) =>
        this.supervisorArchive() === 'all' ||
        (this.supervisorArchive() === 'archived' ? !!s.archivedAt : !s.archivedAt),
    ),
  );
  readonly timeline = computed(() => partitionMeetings(this.meetings(), this.clock.now()));
  readonly upcoming = computed(() => this.timeline().upcoming);
  readonly history = computed(() => this.timeline().history);
  tab = 'upcoming';
  status = '';
  supervisorId = '';
  archived = 'active';
  actionPhase = '';
  actionStatus = 'open';
  actionDue = 'all';
  actionDueDate = '';
  actionMeeting = '';
  actionArchived = 'active';
  readonly actionMeetingOptions = computed(() => [
    ...new Map(
      [
        ...this.meetings().map((m) => ({ id: m.id, title: m.title })),
        ...this.actions().map((a) => ({ id: a.meetingId, title: a.meetingTitle ?? a.meetingId })),
      ].map((m) => [m.id, m]),
    ).values(),
  ]);
  actionQuery() {
    return new URLSearchParams({
      archived: this.actionArchived,
      due: this.actionDue,
      ...(this.actionPhase ? { phase: this.actionPhase } : {}),
      ...(this.actionStatus ? { status: this.actionStatus } : {}),
      ...(this.actionMeeting ? { meetingId: this.actionMeeting } : {}),
      ...(this.actionDueDate ? { dueDate: this.actionDueDate } : {}),
    });
  }
  constructor() {
    this.clock.connect(this.meetings, () => this.state.loadSummary());
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => this.load());
  }
  timezone(): string {
    return this.state.timezone();
  }
  load(): void {
    this.state.load(this.route.snapshot.paramMap.get('id'), {
      archived: this.archived,
      status: this.status,
      supervisorId: this.supervisorId,
    });
    if (!this.state.profiles.loaded() || this.tab === 'supervisors') this.state.profiles.load();
    if (this.tab === 'actions') this.loadActions();
  }
  loadActions(): void {
    this.state.loadActions(this.actionQuery());
  }
  setTab(tab: string): void {
    this.tab = tab;
    if (tab === 'actions') this.loadActions();
    if (tab === 'supervisors') this.state.profiles.load();
  }
  showSupervisors(value: string): void {
    this.supervisorArchive.set(value);
  }
  inspectLatest(): void {
    this.feedback.inspectLatest();
  }
  discardDraft(): void {
    this.feedback.discardDraft();
  }
}

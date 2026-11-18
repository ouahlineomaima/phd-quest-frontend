import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import type { Observable, Subscription } from 'rxjs';
import { ResearchApi, researchError } from '../../core/services/research-api';
import { ReferenceOptions } from '../../shared/state/reference-options';
import type { Meeting, MeetingAction, MeetingSummary, Supervisor } from './meeting.models';
export interface MeetingFilters {
  archived: string;
  status: string;
  supervisorId: string;
}
@Injectable()
export class MeetingsFacade {
  private readonly api = inject(ResearchApi);
  private readonly destroy = inject(DestroyRef);
  private request?: Subscription;
  private summaryRequest?: Subscription;
  private actionsRequest?: Subscription;
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly meetings = signal<Meeting[]>([]);
  readonly current = signal<Meeting | null>(null);
  readonly timezone = signal('Africa/Casablanca');
  readonly summary = signal<MeetingSummary | null>(null);
  readonly summaryError = signal('');
  readonly actions = signal<MeetingAction[]>([]);
  readonly actionsLoading = signal(false);
  readonly actionsError = signal('');
  readonly profiles = new ReferenceOptions<Supervisor>(
    () => this.api.supervisors('?archived=all'),
    this.destroy,
  );
  readonly supervisors = this.profiles.data;
  private detailId: string | null = null;
  private filters: MeetingFilters = { archived: 'active', status: '', supervisorId: '' };
  private actionFilters = new URLSearchParams();
  load(id: string | null, filters: MeetingFilters): void {
    if (id !== this.detailId) {
      this.loaded.set(false);
      this.current.set(null);
    }
    this.detailId = id;
    this.filters = { ...filters };
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    const query =
      '?' +
      new URLSearchParams({
        archived: filters.archived,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.supervisorId ? { supervisorId: filters.supervisorId } : {}),
      }).toString();
    const request: Observable<{
      timezone: string;
      detail: Meeting | null;
      items: Meeting[] | null;
    }> = id
      ? this.api
          .meeting(id)
          .pipe(map((detail) => ({ timezone: detail.timezone, detail, items: null })))
      : this.api
          .meetings(query)
          .pipe(map((list) => ({ timezone: list.timezone, detail: null, items: list.items })));
    this.request = request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (data) => {
        if (data.items) this.meetings.set(data.items);
        this.current.set(data.detail);
        this.timezone.set(data.timezone);
        this.loaded.set(true);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(researchError(error));
        this.loading.set(false);
      },
    });
    // Summary failures never blank a list or detail page. Detail timezone is also
    // supplied by this small independent read; stored instants remain authoritative.
    this.loadSummary();
  }
  loadSummary(): void {
    this.summaryRequest?.unsubscribe();
    this.summaryError.set('');
    this.summaryRequest = this.api
      .get<MeetingSummary>('supervisor-meetings/summary')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (summary) => {
          this.summary.set(summary);
          this.timezone.set(summary.timezone);
        },
        error: (error: unknown) => this.summaryError.set(researchError(error)),
      });
  }
  reload(): void {
    this.load(this.detailId, this.filters);
  }
  loadActions(query: URLSearchParams): void {
    this.actionFilters = new URLSearchParams(query);
    this.actionsRequest?.unsubscribe();
    this.actionsLoading.set(true);
    this.actionsError.set('');
    this.actionsRequest = this.api
      .meetingActions('?' + query.toString())
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          this.actions.set(data.items);
          this.actionsLoading.set(false);
          this.timezone.set(data.timezone);
        },
        error: (error: unknown) => {
          this.actionsError.set(researchError(error));
          this.actionsLoading.set(false);
        },
      });
  }
  change(method: 'POST' | 'PATCH' | 'DELETE', path: string, body: unknown, version?: string) {
    return this.api.change<{ id: string }>(method, path, body, version);
  }
  afterChange(path: string, tab: string): void {
    if (path.startsWith('supervisors')) this.profiles.load();
    if (tab === 'actions') this.loadActions(this.actionFilters);
    // Only primary meeting records and the lightweight summary are refreshed;
    // optional goals/roadmap options are fetched afresh only when an editor needs them.
    this.reload();
  }
  inspect(path: string): Observable<unknown> {
    const parts = path.split('/');
    return parts[0] === 'supervisors'
      ? this.api
          .supervisors('?archived=all')
          .pipe(map((rows) => rows.find((row) => row.id === parts[1])))
      : this.api.meeting(parts[1]);
  }
}

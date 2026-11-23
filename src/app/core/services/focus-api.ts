import type { FocusMode, FocusCompletion, TaskStatus } from '../../shared/models/domain.enums';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs';
export interface FocusSession {
  sessionId: string;
  mode: FocusMode;
  targetSeconds: number | null;
  startedAt: string;
  endedAt: string | null;
  focusedSeconds: number;
  taskRef: string | null;
  taskTitle: string | null;
  completionType: FocusCompletion | null;
  appliedAt: string | null;
  appliedMinutes: number;
  editVersion?: string;
  state?: 'running' | 'paused' | 'stopped';
  kind?: 'focus' | 'break';
  effectiveSeconds?: number;
  applicationMode?: 'task-actual';
  actualMinutesBefore?: number;
  actualMinutesAfter?: number;
}
export interface ActiveFocusSession extends FocusSession {
  state: 'running' | 'paused' | 'stopped';
  kind: 'focus' | 'break';
  editVersion: string;
  confirmedMilliseconds: number;
  elapsedMilliseconds: number;
  serverNow: string;
  leaseUntil: string | null;
  activityUntil: string | null;
  ownerId: string | null;
  ownerToken: string | null;
  heartbeatSequence: number;
  recovered: boolean;
}
export interface FocusHistory {
  items: FocusSession[];
  total: number;
  page: number;
  limit: number;
}
export interface FocusSummary {
  timezone: string;
  today: string;
  weekId: string;
  todayMinutes: number;
  weekMinutes: number;
  overallMinutes: number;
  sessionCount: number;
  completedCountdowns: number;
}
export interface ApplicationPreview {
  session: FocusSession;
  task: {
    title: string;
    status: TaskStatus;
    manualActualMinutes: number;
    appliedFocusMinutes: number;
  } | null;
  proposedMinutes: number;
}
@Injectable({ providedIn: 'root' })
export class FocusApi {
  private readonly http = inject(HttpClient);
  current() {
    return this.http
      .get<ActiveFocusSession | null>('/api/focus-sessions/current')
      .pipe(timeout(10000));
  }
  start(input: object) {
    return this.http
      .post<ActiveFocusSession>('/api/focus-sessions/start', input)
      .pipe(timeout(15000));
  }
  command(
    session: ActiveFocusSession,
    action: 'pause' | 'resume' | 'stop' | 'claim' | 'reconcile',
    ownerId?: string,
  ) {
    return this.http
      .post<ActiveFocusSession>(
        '/api/focus-sessions/' + encodeURIComponent(session.sessionId) + '/' + action,
        ownerId ? { ownerId } : {},
        { headers: { 'If-Match': '"' + session.editVersion + '"' } },
      )
      .pipe(timeout(15000));
  }
  heartbeat(session: ActiveFocusSession, ownerId: string, activity: boolean) {
    return this.http
      .post<ActiveFocusSession>(
        '/api/focus-sessions/' + encodeURIComponent(session.sessionId) + '/heartbeat',
        {
          ownerId,
          ownerToken: session.ownerToken,
          sequence: session.heartbeatSequence + 1,
          activity,
        },
      )
      .pipe(timeout(10000));
  }
  correct(session: FocusSession, effectiveMinutes: number) {
    return this.http
      .post<FocusSession>(
        '/api/focus-sessions/' + encodeURIComponent(session.sessionId) + '/correction',
        { effectiveMinutes },
        { headers: { 'If-Match': '"' + session.editVersion + '"' } },
      )
      .pipe(timeout(15000));
  }
  save(input: object) {
    return this.http.post<FocusSession>('/api/focus-sessions', input).pipe(timeout(30000));
  }
  history(page = 1) {
    return this.http
      .get<FocusHistory>('/api/focus-sessions', { params: { page, limit: 10 } })
      .pipe(timeout(15000));
  }
  summary() {
    return this.http.get<FocusSummary>('/api/focus-sessions/summary').pipe(timeout(15000));
  }
  preview(id: string) {
    return this.http
      .get<ApplicationPreview>(
        '/api/focus-sessions/' + encodeURIComponent(id) + '/application-preview',
      )
      .pipe(timeout(15000));
  }
  apply(id: string, effectiveMinutes?: number, version?: string, expectedActualMinutes?: number) {
    return this.http
      .post<FocusSession>(
        '/api/focus-sessions/' + encodeURIComponent(id) + '/apply-time',
        {
          confirm: true,
          ...(effectiveMinutes === undefined ? {} : { effectiveMinutes, expectedActualMinutes }),
        },
        { headers: version ? { 'If-Match': '"' + version + '"' } : {} },
      )
      .pipe(timeout(30000));
  }
  taskTimes(weekId: string) {
    return this.http
      .get<Record<string, number>>('/api/focus-sessions/task-times', { params: { weekId } })
      .pipe(timeout(15000));
  }
}

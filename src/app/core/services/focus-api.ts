import { FocusMode, FocusCompletion, TaskStatus } from '../../shared/models/domain.enums';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs';
export interface FocusSession {
  sessionId: string;
  mode: FocusMode;
  targetSeconds: number | null;
  startedAt: string;
  endedAt: string;
  focusedSeconds: number;
  taskRef: string | null;
  taskTitle: string | null;
  completionType: FocusCompletion;
  appliedAt: string | null;
  appliedMinutes: number;
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
  apply(id: string) {
    return this.http
      .post<FocusSession>('/api/focus-sessions/' + encodeURIComponent(id) + '/apply-time', {
        confirm: true,
      })
      .pipe(timeout(30000));
  }
  taskTimes(weekId: string) {
    return this.http
      .get<Record<string, number>>('/api/focus-sessions/task-times', { params: { weekId } })
      .pipe(timeout(15000));
  }
}

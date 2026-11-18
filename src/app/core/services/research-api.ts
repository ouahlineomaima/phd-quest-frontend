import type {
  GoalStatus,
  GoalType,
  TaskStatus,
  RoadmapStatus,
} from '../../shared/models/domain.enums';
import type { SkillTree, ResearchSkill } from '../../features/skills/skill.models';
import type {
  Meeting,
  MeetingDetail,
  Supervisor,
  MeetingAction,
} from '../../features/supervisor-meetings/meeting.models';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { timeout } from 'rxjs';
export interface GoalProgress {
  mode: 'linked' | 'manual';
  completed: number;
  total: number;
  percentage: number | null;
}
export interface LinkedTask {
  sourceId: string;
  weekId: string;
  taskId: string;
  title: string;
  date: string;
  status: TaskStatus;
}
export interface LinkedGoal {
  contributionPercent: number;
  id: string;
  title: string;
  status: string;
  completedAt: string | null;
  progress: GoalProgress;
}
export interface Checkpoint {
  checkpointIdentity?: string;
  goalIds?: string[];
  linkedGoals?: LinkedGoal[];
  progress?: { mode: 'linked' | 'manual'; total: number; percentage: number | null };
  id: string;
  title: string;
  description?: string;
  mandatory: boolean;
  completed: boolean;
  validatedAt: string | null;
  evidence: string;
}
export interface ResearchLevel {
  yearTitle?: string;
  levelNumber: number;
  year: number | null;
  title: string;
  description: string;
  objectives: string[];
  checkpoints: Checkpoint[];
  status: RoadmapStatus;
  completedAt: string | null;
}
export interface Goal {
  linkedTaskIds?: string[];
  linkedTasks?: LinkedTask[];
  progress?: GoalProgress;
  id: string;
  title: string;
  description: string;
  type: GoalType;
  status: GoalStatus;
  targetDate: string | null;
  relatedWeekId: string | null;
  relatedRoadmapLevel: number | null;
  completedAt: string | null;
}
export interface Achievement {
  code: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  unlockedAt: string | null;
}
@Injectable({ providedIn: 'root' })
export class ResearchApi {
  private readonly http = inject(HttpClient);
  skills() {
    return this.get<SkillTree>('research-skills');
  }
  skill(id: string) {
    return this.get<ResearchSkill>('research-skills/' + encodeURIComponent(id));
  }
  supervisors(query = '') {
    return this.get<Supervisor[]>('supervisors' + query);
  }
  meetings(query = '') {
    return this.get<{ timezone: string; items: Meeting[] }>('supervisor-meetings' + query);
  }
  meeting(id: string) {
    return this.get<MeetingDetail>('supervisor-meetings/' + encodeURIComponent(id));
  }
  meetingActions(query = '') {
    return this.get<{ timezone: string; today: string; items: MeetingAction[] }>(
      'supervisor-meetings/actions' + query,
    );
  }
  get<T>(path: string) {
    return this.http.get<T>('/api/' + path).pipe(timeout(15000));
  }
  change<T>(method: 'POST' | 'PATCH' | 'DELETE', path: string, body: unknown, version?: string) {
    return this.http
      .request<T>(method, '/api/' + path, {
        body,
        ...(version ? { headers: { 'If-Match': JSON.stringify(version) } } : {}),
      })
      .pipe(timeout(30000));
  }
}
function publicErrorBody(error: HttpErrorResponse): Record<string, unknown> {
  const body: unknown = error.error;
  return body !== null && typeof body === 'object' ? (body as Record<string, unknown>) : {};
}
export function researchError(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status >= 400 && error.status < 500) {
    const message = publicErrorBody(error)['message'];
    return typeof message === 'string' ? message : 'Check the supplied fields and try again.';
  }
  return 'The request could not be confirmed. Reload to check the saved state, then try again.';
}
export function staleRecord(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    error.status === 409 &&
    publicErrorBody(error)['code'] === 'STALE_RECORD'
  );
}

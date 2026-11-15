import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { timeout } from 'rxjs';
export interface Checkpoint { id: string; title: string; description?: string; mandatory: boolean; completed: boolean; validatedAt: string | null; evidence: string; }
export interface ResearchLevel { levelNumber: number; year: number; title: string; description: string; objectives: string[]; checkpoints: Checkpoint[]; status: 'current' | 'completed' | 'locked'; completedAt: string | null; }
export interface Goal { id: string; title: string; description: string; type: 'weekly' | 'monthly' | 'research'; status: 'active' | 'completed' | 'archived'; targetDate: string | null; relatedWeekId: string | null; relatedRoadmapLevel: number | null; completedAt: string | null; }
export interface Achievement { code: string; title: string; description: string; icon: string; category: string; unlockedAt: string | null; }
@Injectable({providedIn: 'root'})
export class ResearchApi {
  private readonly http = inject(HttpClient);
  get<T>(path: string) { return this.http.get<T>('/api/' + path).pipe(timeout(15000)); }
  change<T>(method: 'POST' | 'PATCH', path: string, body: unknown) { return this.http.request<T>(method, '/api/' + path, { body }).pipe(timeout(30000)); }
}
export function researchError(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status >= 400 && error.status < 500) return typeof error.error?.message === 'string' ? error.error.message : 'Check the supplied fields and try again.';
  return 'The request could not be confirmed. Reload to check the saved state, then try again.';
}

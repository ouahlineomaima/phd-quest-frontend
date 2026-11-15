import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { timeout } from 'rxjs';
import { ImportPreview, PlanError, SavedWeeklyPlan, WeekSummary, WeeklyPlanInput } from '../models/weekly-plan.models';

@Injectable({ providedIn: 'root' })
export class WeeklyPlansApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/weekly-plans';
  list() { return this.http.get<WeekSummary[]>(this.base).pipe(timeout(15000)); }
  detail(id: string) { return this.http.get<SavedWeeklyPlan>(`${this.base}/${encodeURIComponent(id)}`).pipe(timeout(15000)); }
  preview(input: unknown) { return this.http.post<ImportPreview>(`${this.base}/import/preview`, input).pipe(timeout(15000)); }
  confirm(input: WeeklyPlanInput) { return this.http.post<SavedWeeklyPlan>(`${this.base}/import/confirm`, input).pipe(timeout(15000)); }
}

export function planError(error: unknown): PlanError {
  if (!(error instanceof HttpErrorResponse) || error.status === 0 || error.status >= 500) {
    return { message: 'The backend is unavailable. Check that Docker is running, then try again.', details: [] };
  }
  const body = error.error as { message?: unknown; details?: unknown } | null;
  const rules: Record<string, string> = {
    whitelistValidation: 'This field is not allowed. Remove it from the import.',
    isString: 'Use a text string.', isInt: 'Use a whole number, not a quoted number.',
    isBoolean: 'Use true or false without quotes.', isEnum: 'Use low, medium, or high.',
    equals: 'Use schemaVersion: 1.', matches: 'Check the required date or lowercase task-ID format.',
    minLength: 'This value must not be blank.', maxLength: 'This text exceeds the documented length limit.',
    min: 'This value is below its allowed minimum.', max: 'This value exceeds its allowed maximum.',
    isArray: 'Use a JSON array.', arrayMinSize: 'Include at least one weekly objective.',
    arrayMaxSize: 'Too many items; use at most 20 objectives and 200 tasks.', nestedValidation: 'Each task must be a JSON object.',
  };
  const details: PlanError['details'] = [];
  if (Array.isArray(body?.details)) for (const item of body.details) {
    if (!item || typeof item !== 'object') continue;
    const field = typeof item.field === 'string' ? item.field : 'plan';
    const message = typeof item.message === 'string' ? item.message
      : Array.isArray(item.rules) ? item.rules.map((rule: string) => rules[rule] ?? 'Check this field against the import format.').join(' ') : 'Check this field.';
    details.push({ field, message });
  }
  return { message: typeof body?.message === 'string' ? body.message : error.status === 413 ? 'The JSON file is too large. Use a file under 500 KiB.' : 'The request could not be completed. Try again.', details };
}

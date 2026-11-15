// Wire format: backend docs/contracts/weekly-plan.v1.schema.json. No progress fields in imports.
export interface PlanTaskInput {
  id: string; date: string; title: string; description?: string; estimatedMinutes: number;
  xpReward: number; priority: 'low' | 'medium' | 'high'; isOptional: boolean; deliverable: string;
}
export interface WeeklyPlanInput {
  schemaVersion: 1; weekId: string; startDate: string; endDate: string;
  title: string; objectives: string[]; tasks: PlanTaskInput[]; notes?: string;
}
export interface SavedTask extends PlanTaskInput { status: 'pending' | 'completed'; actualMinutes: number; completedAt: string | null; }
export interface SavedWeeklyPlan extends Omit<WeeklyPlanInput, 'tasks'> { id: string; tasks: SavedTask[]; createdAt: string; updatedAt: string; }
export interface Workload { taskCount: number; estimatedMinutes: number; potentialXp: number; }
export interface WeekSummary extends Workload { id: string; weekId: string; startDate: string; endDate: string; title: string; createdAt: string; updatedAt: string; }
export interface ImportPreview {
  plan: WeeklyPlanInput; totals: Workload; days: (Workload & { date: string })[];
  canImport: boolean; conflicts: { code: string; field: string; message: string }[];
}
export interface PlanError { message: string; details: { field: string; message: string }[]; }
export const MAX_PLAN_FILE_BYTES = 500 * 1024;

export function weekDates(startDate: string): string[] {
  let [year, month, day] = startDate.split('-').map(Number);
  return Array.from({ length: 7 }, () => {
    const value = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const lengths = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    day++;
    if (day > lengths[month - 1]) { day = 1; month++; }
    if (month > 12) { month = 1; year++; }
    return value;
  });
}

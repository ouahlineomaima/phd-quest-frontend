export type Tone = 'primary' | 'accent' | 'gold' | 'success' | 'muted';
export interface MetricPreview { readonly label: string; readonly value: string; readonly note: string; readonly icon: string; readonly tone: Tone; }
export interface TaskPreview { readonly title: string; readonly project: string; readonly duration: string; readonly category: string; readonly tone: Tone; }
export interface RoadmapLevel { readonly number: number; readonly title: string; readonly detail: string; readonly state: 'completed' | 'current' | 'locked'; }

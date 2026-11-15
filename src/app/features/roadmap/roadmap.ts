import { RouterLink } from '@angular/router';
import { ImportedRoadmap, RoadmapImportDialog } from './roadmap-import-dialog';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Badge, Card, EmptyState, Loading, PageHeader, Progress, SectionHeading } from '../../shared/components/ui';
import { Icon } from '../../shared/components/icon/icon';
import { Checkpoint, Goal, ResearchApi, ResearchLevel, researchError } from '../../core/services/research-api';
@Component({ selector: 'pq-roadmap', standalone: true, imports: [RouterLink, RoadmapImportDialog, Badge, Card, EmptyState, Loading, PageHeader, Progress, SectionHeading, Icon], templateUrl: './roadmap.html', styleUrl: './roadmap.scss' })
export class Roadmap {
  private readonly api = inject(ResearchApi); private readonly destroy = inject(DestroyRef);
  readonly goalOptions = signal<Goal[]>([]); readonly goalLoading = signal(false); readonly goalError = signal('');
  goalIds: Record<string,string[]> = {};
  readonly importOpen = signal(false); readonly notice = signal('');
  readonly levels = signal<ResearchLevel[]>([]); readonly selected = signal<number | null>(null);
  readonly loading = signal(true); readonly busy = signal(false); readonly error = signal('');
  readonly current = computed(() => this.levels().find(l => l.levelNumber > 0 && l.status === 'current'));
  readonly completed = computed(() => this.levels().filter(l => l.levelNumber > 0 && l.status === 'completed').length);
  readonly detail = computed(() => this.levels().find(l => l.levelNumber === this.selected()));
  readonly preparation = computed(() => this.levels().find(level => level.levelNumber === 0));
  readonly years = computed(() => ['Lay the foundations', 'Follow the evidence', 'Make your contribution'].map((title, i) => ({ number: i + 1, title, levels: this.levels().filter(l => l.year === i + 1) })));
  description = ''; evidence: Record<string, string> = {}; confirm = false;
  constructor() { this.load(); }
  load() {
    this.loading.set(true); this.error.set('');
    this.api.get<ResearchLevel[]>('roadmap').pipe(takeUntilDestroyed(this.destroy)).subscribe({next: levels => { this.levels.set(levels); this.loading.set(false); }, error: e => { this.error.set(researchError(e)); this.loading.set(false); }});
  }
  onImported(result: ImportedRoadmap) {
    this.levels.set(result.levels); this.selected.set(null); this.notice.set('Imported ' + result.metadata.title + '. Preparation Camp and research chapter 1 are available independently. Historical achievements are preserved.');
  }
  closeImport() { this.importOpen.set(false); this.load(); }
  open(level: ResearchLevel, dialog: HTMLDialogElement) {
    this.selected.set(level.levelNumber); this.description = level.description; this.evidence = Object.fromEntries(level.checkpoints.map(c => [c.id, c.evidence])); this.confirm = false; this.goalIds = Object.fromEntries(level.checkpoints.map(checkpoint=>[checkpoint.id,[...(checkpoint.goalIds??[])]])); this.error.set(''); dialog.showModal(); if(level.status==='current')this.loadGoals();
  }
  loadGoals() {
    this.goalLoading.set(true);this.goalError.set('');
    this.api.get<Goal[]>('goals').pipe(takeUntilDestroyed(this.destroy)).subscribe({next:goals=>{this.goalOptions.set(goals);this.goalLoading.set(false);},error:error=>{this.goalError.set(researchError(error));this.goalLoading.set(false);}});
  }
  toggleGoal(checkpointId:string,id:string,checked:boolean) {
    const ids=new Set(this.goalIds[checkpointId]??[]);if(checked)ids.add(id);else ids.delete(id);this.goalIds[checkpointId]=[...ids];
  }
  saveGoalLinks(level:ResearchLevel,checkpoint:Checkpoint) { this.save('PATCH',`roadmap/${level.levelNumber}/checkpoints/${checkpoint.id}/goals`,{goalIds:this.goalIds[checkpoint.id]??[]}); }
  ready(level: ResearchLevel) { return level.checkpoints.filter(c => c.mandatory).every(c => c.completed); }
  validated(level: ResearchLevel) { return level.checkpoints.filter(c => c.completed).length; }
  checkpoint(level: ResearchLevel, checkpoint: Checkpoint) {
    this.save('PATCH', `roadmap/${level.levelNumber}/checkpoints/${checkpoint.id}`, {completed: !checkpoint.completed, evidence: this.evidence[checkpoint.id]});
  }
  saveDescription(level: ResearchLevel) { this.save('PATCH', `roadmap/${level.levelNumber}`, {description: this.description}); }
  complete(level: ResearchLevel) { if (this.confirm) this.save('POST', `roadmap/${level.levelNumber}/complete`, {confirm: true}); }
  private save(method: 'POST' | 'PATCH', path: string, body: unknown) {
    if(this.busy() || this.loading())return;
    this.busy.set(true); this.error.set('');
    this.api.change(method, path, body).pipe(takeUntilDestroyed(this.destroy)).subscribe({next: () => { this.busy.set(false); this.confirm = false; this.load(); }, error: e => { this.busy.set(false); this.error.set(researchError(e)); }});
  }
}

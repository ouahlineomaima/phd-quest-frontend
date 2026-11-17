import { Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { Loading } from '../../shared/components/ui';
import { LinkedTask, ResearchApi, researchError } from '../../core/services/research-api';
import { SavedWeeklyPlan, WeekSummary } from '../weekly-plan/models/weekly-plan.models';
@Component({selector:'pq-task-links-picker',standalone:true,imports:[Loading],templateUrl:'./task-links-picker.html',styleUrl:'./task-links-picker.scss'})
export class TaskLinksPicker {
 private readonly api=inject(ResearchApi);private readonly destroy=inject(DestroyRef);private listRequest?:Subscription;private detailRequest?:Subscription;
 readonly active=input(false);readonly disabled=input(false);readonly selected=input<string[]>([]);readonly existing=input<LinkedTask[]>([]);readonly changed=output<string[]>();
 readonly context=input<'goal'|'action'>('goal');
 readonly weeks=signal<WeekSummary[]>([]);readonly plan=signal<SavedWeeklyPlan|null>(null);readonly selectedWeek=signal('');readonly loaded=signal<LinkedTask[]>([]);readonly search=signal('');readonly loading=signal(false);readonly error=signal('');
 readonly picked=computed(()=>this.selected().map(source=>this.loaded().find(task=>task.sourceId===source)??this.existing().find(task=>task.sourceId===source)??{sourceId:source,title:source,weekId:source.split(':')[0],date:''}));
 readonly groups=computed(()=>{const plan=this.plan();if(!plan)return [];const query=this.search().trim().toLowerCase();const tasks=plan.tasks.filter(task=>(task.title+' '+task.date).toLowerCase().includes(query));return [...new Set(tasks.map(task=>task.date))].sort().map(date=>({date,tasks:tasks.filter(task=>task.date===date)}));});
 constructor(){effect(()=>{if(this.active())untracked(()=>this.load());else {this.listRequest?.unsubscribe();this.detailRequest?.unsubscribe();}});}
 load(){this.listRequest?.unsubscribe();this.detailRequest?.unsubscribe();this.loading.set(true);this.error.set('');this.loaded.set([]);this.search.set('');this.plan.set(null);
  this.listRequest=this.api.get<WeekSummary[]>('weekly-plans').pipe(takeUntilDestroyed(this.destroy)).subscribe({next:weeks=>{this.weeks.set(weeks);const wanted=this.selected()[0]?.split(':')[0],week=weeks.find(week=>week.weekId===wanted)??weeks[0];if(week)this.chooseWeek(week.id);else this.loading.set(false);},error:e=>{this.loading.set(false);this.error.set(researchError(e));}});
 }
 chooseWeek(id:string){this.detailRequest?.unsubscribe();this.selectedWeek.set(id);this.loading.set(true);this.error.set('');this.plan.set(null);
  this.detailRequest=this.api.get<SavedWeeklyPlan>('weekly-plans/'+encodeURIComponent(id)).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:plan=>{this.plan.set(plan);const tasks=plan.tasks.map(task=>({sourceId:plan.weekId+':'+task.id,weekId:plan.weekId,taskId:task.id,title:task.title,date:task.date,status:task.status}));this.loaded.update(previous=>[...previous.filter(old=>!tasks.some(task=>task.sourceId===old.sourceId)),...tasks]);this.loading.set(false);},error:e=>{this.loading.set(false);this.error.set(researchError(e));}});
 }
 source(taskId:string){return this.plan()!.weekId+':'+taskId;}
 toggle(source:string,checked:boolean){if(this.disabled())return;const ids=new Set(this.selected());if(checked){if(ids.size>=200){this.error.set('Select at most 200 linked tasks.');return;}ids.add(source);}else ids.delete(source);this.changed.emit([...ids]);}
}

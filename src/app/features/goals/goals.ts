import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Badge, Card, EmptyState, Loading, PageHeader } from '../../shared/components/ui';
import { Goal, ResearchApi, researchError } from '../../core/services/research-api';
@Component({selector:'pq-goals',standalone:true,imports:[Badge,Card,EmptyState,Loading,PageHeader],templateUrl:'./goals.html',styleUrl:'./goals.scss'})
export class Goals {
 private readonly api=inject(ResearchApi);private readonly destroy=inject(DestroyRef);
 readonly goals=signal<Goal[]>([]);readonly loading=signal(true);readonly busy=signal(false);readonly error=signal('');
 status='active';type='';editing:Goal|null=null;title='';description='';goalType='research';targetDate='';relatedWeekId='';relatedRoadmapLevel='';
 readonly archiving=signal<Goal|null>(null);
 constructor(){this.load();}
 load(){this.loading.set(true);this.error.set('');this.api.get<Goal[]>('goals?'+new URLSearchParams({...this.status?{status:this.status}:{},...this.type?{type:this.type}:{}})).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:items=>{this.goals.set(items);this.loading.set(false);},error:e=>{this.error.set(researchError(e));this.loading.set(false);}});}
 open(goal:Goal|null,dialog:HTMLDialogElement){this.editing=goal;this.title=goal?.title??'';this.description=goal?.description??'';this.goalType=goal?.type??'research';this.targetDate=goal?.targetDate??'';this.relatedWeekId=goal?.relatedWeekId??'';this.relatedRoadmapLevel=goal?.relatedRoadmapLevel?.toString()??'';this.error.set('');dialog.showModal();}
 save(event:Event,dialog:HTMLDialogElement){event.preventDefault();this.mutate(this.editing?'PATCH':'POST',this.editing?'goals/'+this.editing.id:'goals',{title:this.title.trim(),description:this.description.trim(),type:this.goalType,targetDate:this.targetDate||null,relatedWeekId:this.relatedWeekId||null,relatedRoadmapLevel:this.relatedRoadmapLevel?Number(this.relatedRoadmapLevel):null},dialog);}
 action(goal:Goal,action:'complete'|'reopen'){this.mutate('PATCH',`goals/${goal.id}/${action}`,{});}
 archive(dialog:HTMLDialogElement){const goal=this.archiving();if(goal)this.mutate('PATCH',`goals/${goal.id}/archive`,{},dialog);}
 private mutate(method:'POST'|'PATCH',path:string,body:unknown,dialog?:HTMLDialogElement){this.busy.set(true);this.error.set('');this.api.change(method,path,body).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:()=>{this.busy.set(false);dialog?.close();this.load();},error:e=>{this.busy.set(false);this.error.set(researchError(e));}});}
}

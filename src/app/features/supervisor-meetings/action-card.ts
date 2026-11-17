import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Progress } from '../../shared/components/ui';
import { MeetingAction } from './meeting.models';
@Component({selector:'pq-meeting-action',standalone:true,imports:[Progress,RouterLink],template:`
<article class="action"><div class="row spread wrap"><h3>{{action().title}}</h3><span class="muted small">Manual status: {{action().status.replace('_',' ')}}</span></div>
@if(action().meetingTitle){<a class="text-link" [routerLink]="['/supervisor-meetings',action().meetingId]">{{action().meetingTitle}}</a>}
<p class="muted small">{{action().phase==='pre_meeting'?'Preparation':'Follow-up'}}{{action().dueDate?' / Due '+action().dueDate:''}}{{action().overdue?' / Overdue':''}}{{action().meetingArchived?' / Archived meeting':''}}</p>
@if(action().description){<p class="description">{{action().description}}</p>}
@if(action().progress.linked===0){<p class="muted small">No linked tasks</p>}@else{
@if(action().progress.percentage!==null){<p class="small">Linked-task progress: {{action().progress.completed}} / {{action().progress.total}} available tasks ({{action().progress.percentage}}%)</p><pq-progress [value]="action().progress.percentage!" label="Linked weekly task progress"/>}
@if(action().progress.missing){<p class="unavailable">{{action().progress.missing}} linked task(s) unavailable. {{action().progress.total?'Percentage covers available tasks only.':'No progress can be calculated.'}}</p>}
<ul>@for(task of action().linkedTasks;track task.sourceId){<li>{{task.weekId}} / {{task.title}} — {{task.missing?'unavailable':task.status}}</li>}</ul>}
@if(editable()){<div class="actions"><button class="button" [disabled]="busy()" (click)="edit.emit(action())">Edit action</button><button class="button" [disabled]="busy()" (click)="remove.emit(action())">Remove action</button></div>}
</article>`,styles:[`:host{display:block}.action{padding:18px;border:1px solid var(--border);border-radius:12px;display:grid;gap:12px}h3,.description,li{overflow-wrap:anywhere}.description{white-space:pre-wrap}ul{margin:0;padding-left:18px;font-size:12px;color:var(--muted)}.unavailable{font-size:12px;color:var(--warning)}`]})
export class ActionCard {readonly action=input.required<MeetingAction>();readonly editable=input(true);readonly busy=input(false);readonly edit=output<MeetingAction>();readonly remove=output<MeetingAction>();}

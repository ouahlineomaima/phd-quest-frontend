import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, forkJoin } from 'rxjs';
import { Badge, Card, EmptyState, Loading, PageHeader } from '../../shared/components/ui';
import { FocusTimer } from '../../core/services/focus-timer.service';
import { ApplicationPreview, FocusApi, FocusHistory, FocusSession, FocusSummary } from '../../core/services/focus-api';
import { timerText } from '../../core/services/focus-timer-engine';
import { ResearchApi, researchError } from '../../core/services/research-api';
import { SavedWeeklyPlan, WeekSummary } from '../weekly-plan/models/weekly-plan.models';
@Component({selector:'pq-focus',standalone:true,imports:[Badge,Card,EmptyState,Loading,PageHeader],templateUrl:'./focus.html',styleUrl:'./focus.scss'})
export class Focus {
  readonly timer=inject(FocusTimer);private readonly api=inject(FocusApi);private readonly research=inject(ResearchApi);private readonly destroy=inject(DestroyRef);
  readonly history=signal<FocusHistory|null>(null);readonly summary=signal<FocusSummary|null>(null);readonly loading=signal(false);readonly error=signal('');
  readonly weeks=signal<WeekSummary[]>([]);readonly plan=signal<SavedWeeklyPlan|null>(null);readonly taskError=signal('');readonly taskLoading=signal(false);
  readonly applying=signal(false);readonly preview=signal<ApplicationPreview|null>(null);readonly applyError=signal('');readonly message=signal('');
  mode:'countdown'|'stopwatch'='countdown';minutes=25;week='';taskRef='';page=1;private weekRequest?:Subscription;private historyRequest?:Subscription;
  readonly time=timerText;
  constructor(){this.load();this.loadWeeks();effect(()=>{if(this.timer.lastSaved()){this.page=1;this.load();}});}
  load(){this.historyRequest?.unsubscribe();this.loading.set(true);this.error.set('');this.historyRequest=forkJoin({history:this.api.history(this.page),summary:this.api.summary()}).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:data=>{this.history.set(data.history);this.summary.set(data.summary);this.loading.set(false);},error:error=>{this.loading.set(false);this.error.set(researchError(error));}});}
  loadWeeks(){this.taskLoading.set(true);this.taskError.set('');this.research.get<WeekSummary[]>('weekly-plans').pipe(takeUntilDestroyed(this.destroy)).subscribe({next:weeks=>{this.weeks.set(weeks);this.taskLoading.set(false);},error:error=>{this.taskLoading.set(false);this.taskError.set(researchError(error));}});}
  chooseWeek(id:string){this.week=id;this.taskRef='';this.plan.set(null);this.weekRequest?.unsubscribe();if(!id){this.taskLoading.set(false);return;}this.taskLoading.set(true);this.taskError.set('');this.weekRequest=this.research.get<SavedWeeklyPlan>('weekly-plans/'+encodeURIComponent(id)).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:plan=>{this.plan.set(plan);this.taskLoading.set(false);},error:error=>{this.taskLoading.set(false);this.taskError.set(researchError(error));}});}
  start(){void this.timer.start(this.mode,this.minutes,this.taskRef||null);}
  break(minutes:number){void this.timer.start('countdown',minutes,null,'break');}
  next(page:number){this.page=page;this.load();}
  async discard(dialog:HTMLDialogElement){await this.timer.discard();dialog.close();}
  openApplication(session:FocusSession,dialog:HTMLDialogElement){this.preview.set(null);this.applyError.set('');this.applying.set(true);dialog.showModal();this.api.preview(session.sessionId).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:preview=>{this.preview.set(preview);this.applying.set(false);},error:error=>{this.applyError.set(researchError(error));this.applying.set(false);}});}
  apply(dialog:HTMLDialogElement){const preview=this.preview();if(!preview||this.applying())return;this.applying.set(true);this.applyError.set('');this.api.apply(preview.session.sessionId).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:()=>{this.timer.lastSaved.set(null);this.applying.set(false);dialog.close();this.message.set('Focus minutes applied once. Manual actual time, completion, XP and streaks are unchanged.');this.load();},error:error=>{this.applying.set(false);this.applyError.set(researchError(error)+' You can retry safely; a session is applied at most once.');}});}
  date(value:string){return new Intl.DateTimeFormat('en',{dateStyle:'medium',timeStyle:'short',timeZone:this.summary()?.timezone??'Africa/Casablanca'}).format(new Date(value));}
  eligible(session:FocusSession){return !!session.taskRef&&!session.appliedAt&&session.focusedSeconds>=60;}
}

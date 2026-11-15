import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Badge, Card, EmptyState, Loading, PageHeader, Progress, Ring, SectionHeading, Stat } from '../../shared/components/ui';
import { Icon } from '../../shared/components/icon/icon';
import { GamificationState, GamificationSummary, streakStatus } from '../../core/services/gamification.service';
import { Achievement, Goal, ResearchApi, ResearchLevel, researchError } from '../../core/services/research-api';
import { MetricPreview } from '../../shared/models/preview.models';
import { SavedTask, WeeklyProgress } from '../weekly-plan/models/weekly-plan.models';
export interface DashboardData {
 asOf:string;timezone:string;today:string;gamification:GamificationSummary;
 week:{weekId:string;startDate:string;endDate:string;baselineMinutes:number;planId:string|null;title:string|null;progress:WeeklyProgress|null;plannedMinutes:number;todayTasks:SavedTask[];days:{date:string;totalTasks:number;completedTasks:number;plannedMinutes:number;actualMinutes:number}[]};
 research:{preparation:ResearchLevel|null;current:ResearchLevel|null;completedLevels:number;totalLevels:number;checkpointCompleted:number;checkpointTotal:number};
 goals:{activeCount:number;items:Goal[]};achievements:{total:number;unlocked:number;recent:Achievement[]};
 recentActivity:{eventId:string;date:string;occurredAt:string;planId:string;taskId:string}[];
}
@Component({selector:'pq-dashboard',standalone:true,imports:[RouterLink,Badge,Card,EmptyState,Loading,PageHeader,Progress,Ring,SectionHeading,Stat,Icon],templateUrl:'./dashboard.html',styleUrl:'./dashboard.scss'})
export class Dashboard {
 private readonly api=inject(ResearchApi);private readonly destroy=inject(DestroyRef);private readonly gamification=inject(GamificationState);
 readonly data=signal<DashboardData|null>(null);readonly loading=signal(true);readonly error=signal('');
 readonly metrics=computed<MetricPreview[]>(()=>{const d=this.data();if(!d)return [];return [
  {label:'Player level',value:String(d.gamification.playerLevel),note:d.gamification.totalXp+' XP / '+d.gamification.xpRemainingToNextLevel+' XP to next level',icon:'sparkles',tone:'primary'},
  {label:'Daily streak',value:d.gamification.currentStreak+(d.gamification.currentStreak===1?' day':' days'),note:streakStatus(d.gamification)+' / Best: '+d.gamification.longestStreak+(d.gamification.longestStreak===1?' day':' days'),icon:'flame',tone:'gold'},
  {label:'Weekly progress',value:d.week.progress?d.week.progress.completionPercent+'%':'No plan',note:d.week.progress?d.week.progress.completedTasks+' of '+d.week.progress.totalTasks+' tasks complete':'No plan for this week',icon:'target',tone:'success'},
  {label:'Recorded workload',value:this.hours(d.week.progress?.actualRecordedMinutes??0)+' h',note:this.hours(d.week.plannedMinutes)+' h planned / 6 h weekly baseline',icon:'clock',tone:'accent'},
 ];});
 readonly chartMax=computed(()=>Math.max(60,...(this.data()?.week.days.map(d=>d.plannedMinutes)??[])));
 constructor(){this.load();}
 load(){this.loading.set(true);this.error.set('');this.api.get<DashboardData>('dashboard').pipe(takeUntilDestroyed(this.destroy)).subscribe({next:data=>{this.data.set(data);this.gamification.accept(data.gamification);this.loading.set(false);},error:e=>{this.error.set(researchError(e));this.loading.set(false);}});}
 hours(minutes:number){return (minutes/60).toLocaleString(undefined,{maximumFractionDigits:1});}
 time(value:string){return new Intl.DateTimeFormat(undefined,{timeZone:this.data()?.timezone,dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}
 dayName(date:string){return new Intl.DateTimeFormat('en',{weekday:'short',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));}
}

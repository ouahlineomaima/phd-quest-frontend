import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Badge, Card, EmptyState, Loading, PageHeader, Progress } from '../../shared/components/ui';
import { Icon } from '../../shared/components/icon/icon';
import { Achievement, ResearchApi, researchError } from '../../core/services/research-api';
import { GamificationState } from '../../core/services/gamification.service';
@Component({selector:'pq-achievements',standalone:true,imports:[Badge,Card,EmptyState,Loading,PageHeader,Progress,Icon,DatePipe],templateUrl:'./achievements.html',styleUrl:'./achievements.scss'})
export class Achievements {
 private readonly api=inject(ResearchApi);private readonly destroy=inject(DestroyRef);
 readonly gamification=inject(GamificationState);readonly achievements=signal<Achievement[]>([]);readonly loading=signal(true);readonly error=signal('');
 readonly unlocked=computed(()=>this.achievements().filter(a=>a.unlockedAt).length);
 constructor(){this.load();}
 load(){this.loading.set(true);this.error.set('');this.api.get<Achievement[]>('achievements').pipe(takeUntilDestroyed(this.destroy)).subscribe({next:items=>{this.achievements.set(items);this.loading.set(false);},error:e=>{this.error.set(researchError(e));this.loading.set(false);}});}
}

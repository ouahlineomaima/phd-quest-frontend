import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Card, Loading } from '../../shared/components/ui';
import { ResearchApi, researchError } from '../../core/services/research-api';
import { SkillsSummary } from './skill.models';
@Component({
  selector: 'pq-skills-summary',
  standalone: true,
  imports: [Card, Loading, RouterLink],
  template: `<pq-card
    ><div class="row spread wrap">
      <h2>Research Skills</h2>
      <a class="text-link" routerLink="/skills">Explore Skill Tree</a>
    </div>
    @if (loading()) {
      <pq-loading label="Loading skill summary" />
    } @else if (error()) {
      <p role="alert">{{ error() }}</p>
      <button class="button" (click)="load()">Retry skill summary</button>
    } @else if (data(); as summary) {
      <div class="counts">
        <span
          ><strong>{{ summary.totalActive }}</strong> active skills</span
        ><span
          ><strong>{{ summary.inDevelopment }}</strong> in development</span
        ><span
          ><strong>{{ summary.advanced }}</strong> advanced</span
        >
      </div>
      <p class="muted small">
        In development: confirmed Levels 1–3. Advanced: Level 4. Archived categories and skills are
        excluded.
      </p>
      <h3>Recently improved</h3>
      <ul>
        @for (skill of summary.recentlyImproved; track skill.id) {
          <li>{{ skill.name }} / confirmed Level {{ skill.proficiency }}</li>
        } @empty {
          <li class="muted">Your confirmed improvements will appear here.</li>
        }
      </ul>
    }
  </pq-card>`,
  styles: [
    `
      .counts {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        margin: 18px 0;
        font-size: 12px;
        color: var(--muted);
      }
      strong {
        color: var(--text);
      }
      h3 {
        margin-top: 16px;
      }
      ul {
        padding-left: 18px;
        font-size: 12px;
      }
    `,
  ],
})
export class SkillsSummaryCard {
  private readonly api = inject(ResearchApi);
  private readonly destroy = inject(DestroyRef);
  readonly data = signal<SkillsSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.api
      .get<SkillsSummary>('research-skills/summary')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          this.data.set(data);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(researchError(e));
          this.loading.set(false);
        },
      });
  }
}

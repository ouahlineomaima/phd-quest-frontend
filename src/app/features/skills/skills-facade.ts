import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import type { Subscription, Observable } from 'rxjs';
import { ResearchApi, researchError } from '../../core/services/research-api';
import type { SkillTree } from './skill.models';
@Injectable()
export class SkillsFacade {
  private readonly api = inject(ResearchApi);
  private readonly destroy = inject(DestroyRef);
  private request?: Subscription;
  readonly tree = signal<SkillTree>({ initialized: false, categories: [], skills: [] });
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly selectedId = signal('');
  readonly current = computed(
    () => this.tree().skills.find((s) => s.id === this.selectedId()) ?? null,
  );
  load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.request = this.api
      .skills()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (tree) => {
          this.tree.set(tree);
          this.loaded.set(true);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.error.set(researchError(error));
          this.loading.set(false);
        },
      });
  }
  change(method: 'POST' | 'PATCH' | 'DELETE', path: string, body: unknown, version?: string) {
    return this.api.change<unknown>(
      method,
      'research-skills' + (path ? '/' + path : ''),
      body,
      version,
    );
  }
  inspect(path: string): Observable<unknown> {
    const parts = path.split('/');
    return parts[0] === 'categories'
      ? this.api.skills().pipe(map((tree) => tree.categories.find((c) => c.id === parts[1])))
      : this.api.skill(parts[0]);
  }
}

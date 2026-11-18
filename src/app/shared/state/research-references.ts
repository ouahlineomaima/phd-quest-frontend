import { DestroyRef, Injectable, inject } from '@angular/core';
import { ResearchApi } from '../../core/services/research-api';
import type { Goal, ResearchLevel } from '../../core/services/research-api';
import { ReferenceOptions } from './reference-options';
@Injectable()
export class ResearchReferences {
  private readonly api = inject(ResearchApi);
  private readonly destroy = inject(DestroyRef);
  readonly goals = new ReferenceOptions<Goal>(() => this.api.get<Goal[]>('goals'), this.destroy);
  readonly roadmap = new ReferenceOptions<ResearchLevel>(
    () => this.api.get<ResearchLevel[]>('roadmap'),
    this.destroy,
  );
}

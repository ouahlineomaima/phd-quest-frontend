import { computed, signal } from '@angular/core';
import type { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Observable, Subscription } from 'rxjs';
import { researchError } from '../../core/services/research-api';

// Local, independently recoverable picker data. It never owns primary feature data.
export class ReferenceOptions<T> {
  readonly data = signal<T[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly loaded = signal(false);
  readonly ready = computed(() => this.loaded() && !this.loading() && !this.error());
  private request?: Subscription;
  constructor(
    private readonly fetch: () => Observable<T[]>,
    private readonly destroy: DestroyRef,
  ) {}
  load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.request = this.fetch()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          this.data.set(data);
          this.loaded.set(true);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.error.set(researchError(error));
          this.loading.set(false);
        },
      });
  }
}

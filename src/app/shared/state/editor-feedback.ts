import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Observable } from 'rxjs';
import { researchError, staleRecord } from '../../core/services/research-api';
@Injectable()
export class EditorFeedback {
  private readonly destroy = inject(DestroyRef);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly conflictDraft = signal('');
  readonly latestRecord = signal('');
  private reader?: () => Observable<unknown>;
  private discardWork?: () => void;
  reset(): void {
    this.error.set('');
    this.conflictDraft.set('');
    this.latestRecord.set('');
    this.reader = undefined;
    this.discardWork = undefined;
  }
  save<T>(
    request: () => Observable<T>,
    draft: unknown,
    success: (value: T) => void,
    reader: () => Observable<unknown>,
    discard: () => void,
  ): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.reset();
    this.success.set('');
    this.reader = reader;
    this.discardWork = discard;
    request()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (value) => {
          this.busy.set(false);
          this.success.set('Changes saved.');
          success(value);
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.error.set(researchError(error));
          if (staleRecord(error)) this.conflictDraft.set(JSON.stringify(draft, null, 2));
        },
      });
  }
  inspectLatest(): void {
    if (this.busy() || !this.reader) return;
    this.busy.set(true);
    this.reader()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (value) => {
          this.latestRecord.set(JSON.stringify(value ?? null, null, 2));
          this.busy.set(false);
        },
        error: (error: unknown) => {
          this.error.set(researchError(error));
          this.busy.set(false);
        },
      });
  }
  discardDraft(): void {
    if (this.busy()) return;
    const work = this.discardWork;
    this.reset();
    work?.();
  }
}

import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timeout } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  readonly status = signal<'checking' | 'online' | 'offline'>('checking');

  constructor() {
    this.check();
  }
  check() {
    this.status.set('checking');
    this.http
      .get<{ status: string; database: string }>('/api/health')
      .pipe(timeout(5000), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) =>
          this.status.set(
            result.status === 'ok' && result.database === 'up' ? 'online' : 'offline',
          ),
        error: () => this.status.set('offline'),
      });
  }
}

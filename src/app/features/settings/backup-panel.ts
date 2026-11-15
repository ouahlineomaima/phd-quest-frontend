import { Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timeout } from 'rxjs';
import { Loading } from '../../shared/components/ui';
import { Icon } from '../../shared/components/icon/icon';
import { GamificationState } from '../../core/services/gamification.service';
import { HealthService } from '../../core/services/health.service';
const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
interface BackupPreview {
  exportedAt: string; schemaVersion: number; settings: { timezone: string };
  preparationCampAdded?: boolean; counts: Record<string, number>; digest: string; revision: number;
}
@Component({ selector: 'pq-backup-panel', standalone: true, imports: [Loading, Icon], templateUrl: './backup-panel.html', styleUrl: './backup-panel.scss' })
export class BackupPanel {
  private readonly http = inject(HttpClient); private readonly destroy = inject(DestroyRef);
  private readonly gamification = inject(GamificationState); private readonly health = inject(HealthService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('restoreDialog');
  private source: unknown; private sequence = 0;
  readonly stage = signal<'idle' | 'reading' | 'validating' | 'preview' | 'restoring' | 'error' | 'success'>('idle');
  readonly busy = computed(() => ['reading', 'validating', 'restoring'].includes(this.stage()));
  readonly exporting = signal(false); readonly exportMessage = signal(''); readonly exportFailed = signal(false);
  readonly preview = signal<BackupPreview | null>(null); readonly error = signal(''); readonly filename = signal('');
  confirmation = '';
  readonly sections = [ ['weeklyPlans', 'Weekly plans'], ['xpTransactions', 'XP transactions'], ['dailyActivity', 'Activity days'], ['roadmapLevels', 'Roadmap levels (including preparation)'], ['goals', 'Goals'], ['achievements', 'Achievements'] ];
  export() {
    if (this.exporting() || this.busy()) return;
    this.exporting.set(true); this.exportMessage.set(''); this.exportFailed.set(false);
    this.http.get<{ exportedAt: string }>('/api/backup/export').pipe(timeout(60000), takeUntilDestroyed(this.destroy)).subscribe({
      next: backup => {
        const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
        const url = URL.createObjectURL(blob), link = document.createElement('a');
        link.href = url; link.download = 'phd-quest-backup-' + backup.exportedAt.slice(0, 10) + '.json';
        document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.exporting.set(false); this.exportMessage.set('Backup download started. Keep the JSON file somewhere safe.');
      },
      error: e => { this.exporting.set(false); this.exportFailed.set(true); this.exportMessage.set(this.message(e)); },
    });
  }
  async choose(event: Event) {
    const input = event.target as HTMLInputElement, file = input.files?.[0];
    input.value = ''; if (!file || this.busy() || this.exporting()) return;
    const sequence = ++this.sequence;
    this.source = undefined; this.preview.set(null); this.confirmation = ''; this.error.set(''); this.filename.set(file.name); this.stage.set('reading');
    this.dialog().nativeElement.showModal();
    if (!file.name.toLowerCase().endsWith('.json') || file.size > MAX_BACKUP_BYTES) { this.fail('Choose a JSON backup file no larger than 20 MiB.'); return; }
    let source: unknown;
    try { source = JSON.parse((await file.text()).replace(/^\uFEFF/, '')); }
    catch { if (sequence === this.sequence) this.fail('The file could not be read as JSON. Select a valid exported backup.'); return; }
    if (sequence !== this.sequence || this.destroy.destroyed) return;
    this.source = source; this.validate();
  }
  validate() {
    if (this.source === undefined || this.stage() === 'restoring' || this.stage() === 'validating') return;
    this.confirmation = ''; this.preview.set(null); this.error.set(''); this.stage.set('validating');
    this.http.post<BackupPreview>('/api/backup/preview', { backup: this.source }).pipe(timeout(60000), takeUntilDestroyed(this.destroy)).subscribe({
      next: preview => { this.preview.set(preview); this.stage.set('preview'); }, error: e => this.fail(this.message(e)),
    });
  }
  restore() {
    const preview = this.preview();
    if (this.stage() !== 'preview' || !preview || this.confirmation !== 'REPLACE ALL DATA') return;
    this.stage.set('restoring'); this.error.set('');
    this.http.post('/api/backup/import', { backup: this.source, confirmation: this.confirmation, digest: preview.digest, revision: preview.revision }).pipe(timeout(90000), takeUntilDestroyed(this.destroy)).subscribe({
      next: () => { this.stage.set('success'); this.source = undefined; this.confirmation = ''; this.gamification.refresh(); this.health.check(); },
      error: e => { this.confirmation = ''; this.fail(this.message(e) + ' Reload the workspace to check its saved state before trying again.'); },
    });
  }
  canValidate() { return this.source !== undefined; }
  close() { if (this.busy()) return; this.sequence++; this.dialog().nativeElement.close(); this.source = undefined; this.preview.set(null); this.confirmation = ''; this.stage.set('idle'); }
  reload() { window.location.assign('/dashboard'); }
  private fail(message: string) { this.error.set(message); this.stage.set('error'); }
  private message(error: unknown) {
    if (error instanceof HttpErrorResponse && error.status >= 400 && error.status < 500) {
      const detail = Array.isArray(error.error?.details) ? error.error.details.slice(0, 3).map((d: {field?:string;message?:string}) => [d.field,d.message].filter(Boolean).join(': ')).join(' ') : '';
      return (typeof error.error?.message === 'string' ? error.error.message : 'Check the selected backup.') + (detail ? ' ' + detail : '');
    }
    return 'The operation could not be confirmed. Check the backend connection and try again.';
  }
}

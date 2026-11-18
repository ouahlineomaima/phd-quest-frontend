import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Badge, Loading } from '../../shared/components/ui';
import { ResearchApi, ResearchLevel, researchError } from '../../core/services/research-api';
interface PlannedCheckpoint {
  id: string;
  title: string;
  description?: string;
  required: boolean;
}
interface PlannedLevel {
  levelNumber: number;
  title: string;
  description: string;
  objectives: string[];
  checkpoints: PlannedCheckpoint[];
}
interface PlannedRoadmap {
  schemaVersion: 1;
  roadmapId: string;
  title: string;
  durationYears: 3;
  levels: PlannedLevel[];
}
interface RoadmapPreview {
  roadmap: PlannedRoadmap;
  digest: string;
  revision: number;
  metadataPersisted: false;
  totals: { levels: number; objectives: number; checkpoints: number; requiredCheckpoints: number };
  existing: {
    willReplace: boolean;
    levels: number;
    completedLevels: number;
    validatedCheckpoints: number;
    historicalCheckpointValidations: number;
  };
}
export interface ImportedRoadmap {
  levels: ResearchLevel[];
  metadata: { roadmapId: string; title: string; durationYears: number; persisted: false };
}
@Component({
  selector: 'pq-roadmap-import-dialog',
  standalone: true,
  imports: [Badge, Loading],
  templateUrl: './roadmap-import-dialog.html',
  styleUrl: './roadmap-import-dialog.scss',
})
export class RoadmapImportDialog implements AfterViewInit {
  private readonly api = inject(ResearchApi);
  private readonly destroy = inject(DestroyRef);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private source: unknown;
  private sequence = 0;
  readonly closed = output<void>();
  readonly imported = output<ImportedRoadmap>();
  readonly stage = signal<
    'idle' | 'reading' | 'validating' | 'preview' | 'saving' | 'error' | 'conflict'
  >('idle');
  readonly preview = signal<RoadmapPreview | null>(null);
  readonly filename = signal('');
  readonly error = signal('');
  confirmation = '';
  ngAfterViewInit() {
    this.dialog().nativeElement.showModal();
  }
  busy() {
    return ['reading', 'validating', 'saving'].includes(this.stage());
  }
  close() {
    if (this.busy()) return;
    this.sequence++;
    this.dialog().nativeElement.close();
    this.closed.emit();
  }
  async choose(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    input.value = '';
    if (!file || this.busy()) return;
    const sequence = ++this.sequence;
    this.preview.set(null);
    this.source = undefined;
    this.confirmation = '';
    this.error.set('');
    this.filename.set(file.name);
    if (!file.name.toLowerCase().endsWith('.json') || file.size > 500 * 1024) {
      this.fail('Choose a .json roadmap file no larger than 500 KiB.');
      return;
    }
    this.stage.set('reading');
    let source: unknown;
    try {
      source = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
    } catch {
      if (sequence === this.sequence)
        this.fail('This file is not valid JSON. Select a valid roadmap file.');
      return;
    }
    if (sequence !== this.sequence || this.destroy.destroyed) return;
    this.source = source;
    this.validate();
  }
  validate() {
    if (this.source === undefined || this.stage() === 'saving' || this.stage() === 'validating')
      return;
    this.error.set('');
    this.preview.set(null);
    this.confirmation = '';
    this.stage.set('validating');
    this.api
      .change<RoadmapPreview>('POST', 'roadmap/import/preview', { roadmap: this.source })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (preview) => {
          this.preview.set(preview);
          this.stage.set('preview');
        },
        error: (error) => this.fail(this.message(error)),
      });
  }
  confirm() {
    const preview = this.preview();
    if (this.stage() !== 'preview' || !preview || this.confirmation !== 'REPLACE ROADMAP') return;
    this.stage.set('saving');
    this.error.set('');
    this.api
      .change<ImportedRoadmap>('POST', 'roadmap/import/confirm', {
        roadmap: preview.roadmap,
        digest: preview.digest,
        revision: preview.revision,
        confirmation: this.confirmation,
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          this.dialog().nativeElement.close();
          this.imported.emit(result);
          this.closed.emit();
        },
        error: (error) => {
          this.confirmation = '';
          this.error.set(this.message(error));
          this.stage.set(
            error instanceof HttpErrorResponse && error.status === 409 ? 'conflict' : 'error',
          );
        },
      });
  }
  canValidate() {
    return this.source !== undefined;
  }
  private fail(message: string) {
    this.error.set(message);
    this.stage.set('error');
  }
  private message(error: unknown) {
    const message = researchError(error);
    if (!(error instanceof HttpErrorResponse) || !Array.isArray(error.error?.details))
      return message;
    const details = error.error.details
      .slice(0, 4)
      .map((detail: { field?: string; message?: string; rules?: string[] }) => {
        const rules = detail.rules?.includes('whitelistValidation')
          ? 'Remove unexpected fields, including progress, XP and database IDs.'
          : detail.rules?.includes('arrayUnique')
            ? 'Checkpoint IDs must be unique within each level.'
            : 'Check required fields, types, text limits and the twelve-level structure.';
        return (detail.field ? detail.field + ': ' : '') + (detail.message ?? rules);
      })
      .join(' ');
    return message + (details ? ' ' + details : '');
  }
}

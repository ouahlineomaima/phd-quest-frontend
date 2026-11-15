import { AfterViewInit, Component, DestroyRef, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Badge, Loading } from '../../../shared/components/ui';
import { Icon } from '../../../shared/components/icon/icon';
import { ImportPreview, MAX_PLAN_FILE_BYTES, PlanError, SavedWeeklyPlan } from '../models/weekly-plan.models';
import { planError, WeeklyPlansApi } from '../services/weekly-plans.service';
import { PlanTask } from './plan-task';

@Component({ selector: 'pq-import-dialog', standalone: true, imports: [Badge, Loading, Icon, PlanTask], templateUrl: './import-dialog.html', styleUrl: './import-dialog.scss' })
export class ImportDialog implements AfterViewInit {
  private readonly api = inject(WeeklyPlansApi); private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private sequence = 0; private source: unknown;
  readonly closed = output<void>(); readonly saved = output<SavedWeeklyPlan>();
  readonly stage = signal<'idle' | 'reading' | 'validating' | 'preview' | 'saving' | 'error' | 'conflict'>('idle');
  readonly preview = signal<ImportPreview | null>(null); readonly error = signal<PlanError | null>(null); readonly filename = signal('');
  readonly days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  ngAfterViewInit() { this.dialog().nativeElement.showModal(); }
  busy() { return ['reading', 'validating', 'saving'].includes(this.stage()); }
  close() { if (this.stage() === 'saving') return; this.sequence++; this.dialog().nativeElement.close(); this.closed.emit(); }
  cancel(event: Event) { event.preventDefault(); this.close(); }
  async choose(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || this.busy()) return;
    const sequence = ++this.sequence;
    this.preview.set(null); this.error.set(null); this.source = undefined; this.filename.set(file.name);
    if (!file.name.toLowerCase().endsWith('.json')) return this.fail('Choose a .json file.');
    if (file.size > MAX_PLAN_FILE_BYTES) return this.fail('The JSON file must be at most 500 KiB. Choose a smaller plan.');
    this.stage.set('reading');
    let text: string;
    try { text = await file.text(); } catch { if (sequence === this.sequence) this.fail('The file could not be read. Select it again.'); return; }
    if (sequence !== this.sequence || this.destroyRef.destroyed) return;
    try { this.source = JSON.parse(text.replace(/^\uFEFF/, '')); }
    catch { this.fail('This file is not valid JSON. Check commas, quotes, and brackets, then select it again.'); return; }
    this.validate();
  }
  validate() {
    if (this.source === undefined || this.stage() === 'saving' || this.stage() === 'validating') return;
    this.preview.set(null); this.error.set(null); this.stage.set('validating');
    this.api.preview(this.source).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: preview => { this.preview.set(preview); this.stage.set(preview.canImport ? 'preview' : 'conflict'); },
      error: error => { this.error.set(planError(error)); this.stage.set('error'); },
    });
  }
  confirm() {
    const preview = this.preview();
    if (this.stage() !== 'preview' || !preview?.canImport) return;
    this.stage.set('saving'); this.error.set(null);
    this.api.confirm(preview.plan).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: plan => { this.dialog().nativeElement.close(); this.saved.emit(plan); this.closed.emit(); },
      error: error => { this.error.set(planError(error)); this.stage.set('error'); },
    });
  }
  tasksFor(date: string) { return this.preview()?.plan.tasks.filter(task => task.date === date) ?? []; }
  canValidate() { return this.source !== undefined; }
  private fail(message: string) { this.error.set({ message, details: [] }); this.stage.set('error'); }
}

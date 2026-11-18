import { Component, input, output } from '@angular/core';
@Component({
  selector: 'pq-stale-conflict',
  standalone: true,
  template: ` <section role="alert" aria-label="Unsaved conflicting draft">
    <p>This record was changed in another tab or session. Your edits have not been saved.</p>
    <p>
      Your draft is retained below. Inspect the latest record, or explicitly discard your draft and
      reload before editing again.
    </p>
    <details>
      <summary>Unsaved draft</summary>
      <pre>{{ draft() }}</pre>
    </details>
    <button type="button" class="button" [disabled]="busy()" (click)="inspect.emit()">
      Inspect latest record
    </button>
    <button type="button" class="button" [disabled]="busy()" (click)="discard.emit()">
      Discard draft and reload
    </button>
    @if (latest()) {
      <details open>
        <summary>Latest saved record</summary>
        <pre>{{ latest() }}</pre>
      </details>
    }
  </section>`,
  styles: [
    `
      pre {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        max-height: 18rem;
        overflow: auto;
      }
      section {
        border: 1px solid var(--color-warning, #c98f42);
        padding: 1rem;
        border-radius: 12px;
      }
      button {
        margin: 0.25rem;
      }
    `,
  ],
})
export class StaleConflict {
  readonly draft = input.required<string>();
  readonly latest = input('');
  readonly busy = input(false);
  readonly inspect = output<void>();
  readonly discard = output<void>();
}

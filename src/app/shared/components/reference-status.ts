import { Component, input } from '@angular/core';
import type { Signal } from '@angular/core';
import { Loading } from './ui';
interface ReferenceStatus {
  loading: Signal<boolean>;
  error: Signal<string>;
  load(): void;
}
@Component({
  selector: 'pq-reference-status',
  standalone: true,
  imports: [Loading],
  template: `
    @if (status().loading()) {
      <pq-loading [label]="'Loading ' + label() + ' options'" />
    }
    @if (status().error()) {
      <div class="notice" role="alert">
        <p>{{ label() }} options are unavailable. Your existing links are retained.</p>
        <button type="button" class="button" (click)="status().load()">
          Retry {{ label() }} options
        </button>
      </div>
    }
  `,
})
export class ReferenceStatusNotice {
  readonly status = input.required<ReferenceStatus>();
  readonly label = input.required<string>();
}

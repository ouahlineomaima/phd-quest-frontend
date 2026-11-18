import { Component, input } from '@angular/core';

@Component({
  selector: 'pq-brand',
  standalone: true,
  template: `<img src="/icon.svg" width="42" height="42" alt="" />
    @if (!compact()) {
      <span
        ><strong>PhD <em>Quest</em></strong
        ><small>Research. Progress. Achieve.</small></span
      >
    }`,
  styles: [
    ':host{display:flex;align-items:center;gap:11px;white-space:nowrap}strong{font-family:"Space Grotesk",sans-serif;font-size:21px;letter-spacing:-.05em}em{font-style:normal;color:var(--primary)}small{display:block;color:var(--muted);font-size:9px;letter-spacing:.025em}',
  ],
})
export class Brand {
  readonly compact = input(false);
}

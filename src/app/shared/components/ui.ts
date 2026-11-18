import { Component, computed, input } from '@angular/core';
import { Icon } from './icon/icon';
import { MetricPreview, Tone } from '../models/preview.models';

@Component({
  selector: 'pq-card',
  standalone: true,
  template: '<ng-content />',
  host: { class: 'ui-card' },
})
export class Card {}

@Component({
  selector: 'pq-page-header',
  standalone: true,
  template: `<div class="page-heading">
    <div>
      <p class="eyebrow">{{ eyebrow() }}</p>
      <h1>{{ title() }}</h1>
      <p class="description">{{ subtitle() }}</p>
    </div>
    <div class="page-actions"><ng-content /></div>
  </div>`,
  styles: [
    '.page-heading{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-bottom:30px}.eyebrow{margin-bottom:9px}.description{font-size:12px;color:var(--muted);margin-top:10px;max-width:560px}.page-actions{display:flex;gap:10px;flex-wrap:wrap}@media(max-width:700px){.page-heading{align-items:flex-start;flex-direction:column;margin-bottom:24px}.page-actions:empty{display:none}}',
  ],
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly eyebrow = input('Your research journey');
}

@Component({
  selector: 'pq-section-heading',
  standalone: true,
  template: `<div>
      <h2>{{ title() }}</h2>
      @if (subtitle()) {
        <p>{{ subtitle() }}</p>
      }
    </div>
    <ng-content />`,
  host: { class: 'section-top' },
  styles: ['p{color:var(--muted);font-size:11px;margin-top:5px}'],
})
export class SectionHeading {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}

@Component({
  selector: 'pq-badge',
  standalone: true,
  template: '<ng-content />',
  host: { '[attr.data-tone]': 'tone()' },
  styles: [
    ':host{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;padding:4px 8px;border-radius:5px;background:var(--primary-soft);color:var(--primary-text);font-size:9px;line-height:1.5;font-weight:600}:host([data-tone=accent]){background:var(--accent-soft);color:var(--accent)}:host([data-tone=gold]){background:var(--gold-soft);color:var(--xp-gold)}:host([data-tone=success]){background:var(--success-soft);color:var(--success)}:host([data-tone=muted]){background:var(--surface-raised);color:var(--muted)}',
  ],
})
export class Badge {
  readonly tone = input<Tone>('primary');
}

@Component({
  selector: 'pq-progress',
  standalone: true,
  template:
    '<div class="track"><span [style.width.%]="percent()" [attr.data-tone]="tone()"></span></div>',
  host: {
    role: 'progressbar',
    '[attr.aria-label]': 'label()',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-valuenow]': 'percent()',
  },
  styles: [
    ':host{display:block;width:100%}.track{height:6px;background:var(--border);border-radius:10px;overflow:hidden}span{display:block;height:100%;background:var(--primary);border-radius:inherit;transition:width .25s}span[data-tone=accent]{background:var(--accent)}span[data-tone=success]{background:var(--success)}span[data-tone=gold]{background:var(--xp-gold)}',
  ],
})
export class Progress {
  readonly value = input(0);
  readonly label = input.required<string>();
  readonly tone = input<Tone>('primary');
  readonly percent = computed(() =>
    Math.min(100, Math.max(0, Number.isFinite(this.value()) ? this.value() : 0)),
  );
}

@Component({
  selector: 'pq-ring',
  standalone: true,
  template: `<svg viewBox="0 0 100 100" aria-hidden="true">
      <circle class="track" cx="50" cy="50" r="42" />
      <circle
        class="fill"
        cx="50"
        cy="50"
        r="42"
        stroke-dasharray="263.9"
        [attr.stroke-dashoffset]="263.9 * (1 - percent() / 100)"
      />
    </svg>
    <div>
      <strong>{{ percent() }}<span>%</span></strong
      ><small>completed</small>
    </div>`,
  host: {
    role: 'progressbar',
    '[attr.aria-label]': 'label()',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-valuenow]': 'percent()',
  },
  styles: [
    ':host{display:block;position:relative;width:112px;height:112px;flex-shrink:0}svg{width:100%;height:100%;transform:rotate(-90deg)}circle{fill:none;stroke-width:5}.track{stroke:var(--border)}.fill{stroke:var(--accent);stroke-linecap:round}div{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column}strong{font-family:"Space Grotesk",sans-serif;font-size:28px;line-height:1.2}strong span{font-size:14px;color:var(--muted)}small{font-size:9px;color:var(--muted)}',
  ],
})
export class Ring {
  readonly value = input(0);
  readonly label = input.required<string>();
  readonly percent = computed(() =>
    Math.round(Math.min(100, Math.max(0, Number.isFinite(this.value()) ? this.value() : 0))),
  );
}

@Component({
  selector: 'pq-stat',
  standalone: true,
  imports: [Icon],
  template: `<div class="row spread">
      <span class="label">{{ metric().label }}</span><span
        class="metric-icon"
        [attr.data-tone]="metric().tone"
        ><pq-icon [name]="metric().icon"
      /></span>
    </div>
    <strong>{{ metric().value }}</strong>
    <p>{{ metric().note }}</p>`,
  host: { class: 'ui-card' },
  styles: [
    '.label{font-size:11px;color:var(--muted)}.metric-icon{color:var(--primary)}.metric-icon[data-tone=gold]{color:var(--xp-gold)}.metric-icon[data-tone=accent]{color:var(--accent)}.metric-icon[data-tone=success]{color:var(--success)}strong{display:block;margin:15px 0 7px;font-family:"Space Grotesk",sans-serif;font-size:30px;line-height:1.2;letter-spacing:-.04em}p{font-size:10px;color:var(--muted)}',
  ],
})
export class Stat {
  readonly metric = input.required<MetricPreview>();
}

@Component({
  selector: 'pq-empty-state',
  standalone: true,
  imports: [Icon],
  template: `<div class="empty-icon"><pq-icon [name]="icon()" /></div>
    <h3>{{ title() }}</h3>
    <p>{{ message() }}</p>
    <ng-content />`,
  styles: [
    ':host{display:flex;align-items:center;text-align:center;flex-direction:column;padding:35px 20px;gap:13px}.empty-icon{width:50px;height:50px;display:grid;place-items:center;border:1px dashed var(--border);border-radius:15px;color:var(--primary);background:var(--primary-soft)}p{color:var(--muted);font-size:11px;max-width:290px;line-height:1.8}',
  ],
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly icon = input('sparkles');
}

@Component({
  selector: 'pq-loading',
  standalone: true,
  template: '<span class="spinner" aria-hidden="true"></span><span>{{ label() }}</span>',
  host: { role: 'status' },
  styles: [
    ':host{display:inline-flex;align-items:center;gap:7px;font-size:10px;color:var(--muted)}.spinner{width:12px;height:12px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}',
  ],
})
export class Loading {
  readonly label = input('Loading');
}

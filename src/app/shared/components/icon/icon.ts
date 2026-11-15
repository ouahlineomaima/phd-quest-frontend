import { Component, computed, input } from '@angular/core';

const paths: Record<string, readonly string[]> = {
  dashboard: ['M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'],
  calendar: ['M8 2v4M16 2v4M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z', 'M7 14h3M14 14h3M7 18h3'],
  roadmap: ['M4 20h4V10h8V4h4', 'M4 17v6M1 20h6M17 4h6M20 1v6'],
  target: ['M21 12a9 9 0 1 1-9-9', 'M17 12a5 5 0 1 1-5-5', 'm12 12 9-9M16 3h5v5'],
  trophy: ['M8 3h8v6a4 4 0 0 1-8 0Z', 'M8 5H4v3a4 4 0 0 0 5 4M16 5h4v3a4 4 0 0 1-5 4M12 13v6M8 21h8M9 19h6'],
  settings: ['M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],
  sun: ['M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5', 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0'],
  moon: ['M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z'],
  menu: ['M4 6h16M4 12h16M4 18h16'], close: ['m6 6 12 12M6 18 18 6'],
  arrow: ['M4 12h15m-5-5 5 5-5 5'], chevron: ['m9 5 7 7-7 7'],
  collapse: ['M9 3v18M3 3h18v18H3z', 'm16 9-3 3 3 3'],
  flame: ['M12 2c2 5 7 7 7 13a7 7 0 0 1-14 0c0-3 2-6 4-8 0 3 1 4 2 4 2-3 2-5 1-9Z'],
  clock: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', 'M12 7v5l3 2'],
  check: ['m5 12 4 4L19 6'], lock: ['M5 10h14v11H5z', 'M8 10V7a4 4 0 0 1 8 0v3'],
  book: ['M12 5v16M3 3c4 0 6 0 9 2 3-2 5-2 9-2v16c-4 0-6 0-9 2-3-2-5-2-9-2Z'],
  sparkles: ['m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z'],
  plus: ['M12 5v14M5 12h14'], upload: ['M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6'],
  download: ['M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4'],
  info: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', 'M12 11v6M12 7v.1'],
};

@Component({
  selector: 'pq-icon', standalone: true,
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">@for (path of lines(); track $index) { <path [attr.d]="path" /> }</svg>`,
  styles: [':host{display:inline-flex;width:20px;height:20px;flex-shrink:0}svg{width:100%;height:100%}'],
})
export class Icon { readonly name = input('sparkles'); readonly lines = computed(() => paths[this.name()] ?? paths['sparkles']); }

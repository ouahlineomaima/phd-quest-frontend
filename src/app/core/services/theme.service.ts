import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  readonly theme = signal<Theme>(this.document.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark');

  set(theme: Theme) {
    this.theme.set(theme);
    this.document.documentElement.dataset['theme'] = theme;
    this.document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0B1020' : '#F4F6FB');
    try { this.document.defaultView?.localStorage.setItem('phd-quest-theme', theme); } catch { /* Theme still works when storage is unavailable. */ }
  }

  toggle() { this.set(this.theme() === 'dark' ? 'light' : 'dark'); }
}

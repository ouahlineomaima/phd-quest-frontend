import type { ElementRef } from '@angular/core';
import { Component, inject, output, signal, viewChild } from '@angular/core';
import { Icon } from '../../shared/components/icon/icon';
import { GamificationState } from '../services/gamification.service';

type Indicator = 'streak' | 'xp' | 'level';

@Component({
  selector: 'pq-gamification-header',
  imports: [Icon],
  templateUrl: './gamification-header.html',
  styleUrl: './gamification-header.scss',
  host: {
    '(document:keydown.escape)': 'close(true)',
    '(document:focusin)': 'focusChanged($event)',
    '(window:resize)': 'close(false)',
  },
})
export class GamificationHeader {
  readonly state = inject(GamificationState);
  readonly opening = output<void>();
  readonly open = signal<Indicator | null>(null);
  readonly left = signal(8);
  readonly top = signal(8);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private trigger: HTMLElement | null = null;

  toggle(kind: Indicator, event: Event) {
    if (this.open() === kind) return this.close(true);
    this.opening.emit();
    this.trigger = event.currentTarget as HTMLElement;
    this.open.set(kind);
    const panel = this.panel()?.nativeElement;
    if (!panel) return;
    if (!panel.matches(':popover-open')) panel.showPopover();
    this.position();
    requestAnimationFrame(() => {
      this.position();
      if (this.open() === kind) panel.focus({ preventScroll: true });
    });
  }
  private position() {
    const panel = this.panel()?.nativeElement;
    if (!panel || !this.trigger || !this.open()) return;
    const anchor = this.trigger.getBoundingClientRect();
    const box = panel.getBoundingClientRect();
    this.left.set(
      Math.max(8, Math.min(anchor.right - box.width, window.innerWidth - box.width - 8)),
    );
    this.top.set(Math.max(8, Math.min(anchor.bottom + 8, window.innerHeight - box.height - 8)));
  }
  close(restoreFocus = false) {
    if (!this.open()) return;
    this.open.set(null);
    this.panel()?.nativeElement.hidePopover();
    if (restoreFocus) this.trigger?.focus({ preventScroll: true });
  }
  onToggle(event: Event) {
    if ((event as ToggleEvent).newState === 'closed') this.open.set(null);
  }
  focusChanged(event: FocusEvent) {
    const target = event.target;
    if (
      this.open() &&
      target instanceof Node &&
      target !== this.trigger &&
      !this.panel()?.nativeElement.contains(target)
    )
      this.close(false);
  }
}

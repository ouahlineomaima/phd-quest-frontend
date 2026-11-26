import { FocusTimer } from '../services/focus-timer.service';
import type { ElementRef } from '@angular/core';
import { Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { Icon } from '../../shared/components/icon/icon';
import { ThemeService } from '../services/theme.service';
import { NAVIGATION } from '../navigation/navigation';
import { Brand } from './brand';
import { HealthService } from '../services/health.service';
import { GamificationHeader } from './gamification-header';

@Component({
  selector: 'pq-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Brand, GamificationHeader],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  host: {
    '[class.collapsed]': 'collapsed() && !mobile()',
    '(document:keydown.escape)': 'closeDrawer()',
  },
})
export class Shell {
  readonly focus = inject(FocusTimer);
  readonly theme = inject(ThemeService);
  readonly links = NAVIGATION;
  readonly health = inject(HealthService);
  readonly collapsed = signal(false);
  readonly drawer = signal(false);
  readonly mobile = signal(window.matchMedia('(max-width: 760px)').matches);
  readonly page = signal('Dashboard');
  readonly meetingDetail = signal(false);
  private readonly player = viewChild(GamificationHeader);
  private readonly sidebar = viewChild<ElementRef<HTMLElement>>('sidebar');
  private readonly menu = viewChild<ElementRef<HTMLButtonElement>>('menu');

  constructor() {
    const router = inject(Router);
    const title = inject(Title);
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => {
      this.mobile.set(media.matches);
      this.drawer.set(false);
    };
    media.addEventListener('change', update);
    inject(DestroyRef).onDestroy(() => media.removeEventListener('change', update));
    router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const path = event.urlAfterRedirects.split(/[?#]/)[0];
        const name =
          this.links.find(
            (link) =>
              link.path === path ||
              (link.path === '/supervisor-meetings' &&
                /^\/supervisor-meetings\/[a-f0-9]{24}$/.test(path)),
          )?.title ?? 'Page not found';
        this.page.set(name);
        this.meetingDetail.set(/^\/supervisor-meetings\/[a-f0-9]{24}$/.test(path));
        title.setTitle(`${name} - PhD Quest`);
        this.closeDrawer();
        this.player()?.close(false);
      }
    });
  }
  openDrawer() {
    this.player()?.close(false);
    this.drawer.set(true);
    requestAnimationFrame(() =>
      this.sidebar()?.nativeElement.querySelector<HTMLAnchorElement>('a')?.focus(),
    );
  }
  closeDrawer() {
    if (this.drawer() && this.mobile()) this.menu()?.nativeElement.focus();
    this.drawer.set(false);
  }
  trapFocus(event: KeyboardEvent) {
    if (!this.mobile() || !this.drawer() || event.key !== 'Tab') return;
    const items = this.sidebar()?.nativeElement.querySelectorAll<HTMLElement>('a, button');
    if (!items?.length) return;
    const first = items[0],
      last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

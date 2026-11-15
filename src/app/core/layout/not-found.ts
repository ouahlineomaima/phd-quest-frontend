import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../shared/components/icon/icon';
@Component({ selector: 'pq-not-found', standalone: true, imports: [RouterLink, Icon], template: `<section class="not-found"><span class="eyebrow">A small detour</span><div class="error-number">404</div><h1>This path is still unexplored.</h1><p class="muted">Let's get you back to your research space.</p><a class="button primary" routerLink="/dashboard">Back to dashboard <pq-icon name="arrow" /></a></section>`, styles: ['.not-found{text-align:center;padding:90px 0;display:grid;justify-items:center;gap:20px}.error-number{font-family:"Space Grotesk",sans-serif;font-size:110px;line-height:1;color:var(--primary);letter-spacing:-.1em}'] })
export class NotFound {}

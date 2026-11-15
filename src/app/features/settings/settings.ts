import { Component, inject } from '@angular/core';
import { Badge, Card, Loading, PageHeader, SectionHeading } from '../../shared/components/ui';
import { Icon } from '../../shared/components/icon/icon';
import { ThemeService } from '../../core/services/theme.service';
import { HealthService } from '../../core/services/health.service';
@Component({ selector: 'pq-settings', standalone: true, imports: [Badge, Card, Loading, PageHeader, SectionHeading, Icon], templateUrl: './settings.html', styleUrl: './settings.scss' })
export class Settings {
  readonly theme = inject(ThemeService); readonly health = inject(HealthService);
  readonly timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
}

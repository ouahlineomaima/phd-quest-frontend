import { Component } from '@angular/core';
import { Badge, Card, PageHeader } from '../../shared/components/ui';
import { Icon } from '../../shared/components/icon/icon';
import { PREVIEW_ACHIEVEMENTS } from '../../core/demo/preview-data';
@Component({ selector: 'pq-achievements', standalone: true, imports: [Badge, Card, PageHeader, Icon], templateUrl: './achievements.html', styleUrl: './achievements.scss' })
export class Achievements { readonly achievements = PREVIEW_ACHIEVEMENTS; }

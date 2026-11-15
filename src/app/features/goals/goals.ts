import { Component } from '@angular/core';
import { Badge, Card, EmptyState, PageHeader, Progress } from '../../shared/components/ui';
import { Icon } from '../../shared/components/icon/icon';
import { PREVIEW_GOALS } from '../../core/demo/preview-data';
@Component({ selector: 'pq-goals', standalone: true, imports: [Badge, Card, EmptyState, PageHeader, Progress, Icon], templateUrl: './goals.html', styleUrl: './goals.scss' })
export class Goals { readonly goals = PREVIEW_GOALS; }

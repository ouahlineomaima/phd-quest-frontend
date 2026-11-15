import { Component } from '@angular/core';
import { Badge, Card, PageHeader, Progress, SectionHeading } from '../../shared/components/ui';
import { Icon } from '../../shared/components/icon/icon';
import { PREVIEW_LEVELS } from '../../core/demo/preview-data';
@Component({ selector: 'pq-roadmap', standalone: true, imports: [Badge, Card, PageHeader, Progress, SectionHeading, Icon], templateUrl: './roadmap.html', styleUrl: './roadmap.scss' })
export class Roadmap {
  readonly years = [
    { number: '01', title: 'Lay the foundations', subtitle: 'Explore, question, and shape your direction.', levels: PREVIEW_LEVELS.slice(0, 4) },
    { number: '02', title: 'Follow the evidence', subtitle: 'Experiment, discover, and connect the dots.', levels: PREVIEW_LEVELS.slice(4, 8) },
    { number: '03', title: 'Make your contribution', subtitle: 'Write, refine, and share what you have found.', levels: PREVIEW_LEVELS.slice(8, 12) },
  ];
}

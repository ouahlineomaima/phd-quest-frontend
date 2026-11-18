import { Component, input } from '@angular/core';
import { Progress } from '../../shared/components/ui';
import { SkillProgress } from './skill.models';
@Component({
  selector: 'pq-skill-progress',
  standalone: true,
  imports: [Progress],
  template: `<div class="group">
    <div class="row spread wrap">
      <h3>{{ title() }}</h3>
      <span class="muted small">{{ group().total }} association(s)</span>
    </div>
    @if (!group().total) {
      <p class="muted small">No linked activities</p>
    } @else {
      <p class="small">
        {{ group().completed }} / {{ group().available }} available activities completed{{
          group().percentage === null || group().missing ? '' : ' / ' + group().percentage + '%'
        }}
      </p>
      @if (group().percentage !== null && !group().missing) {
        <pq-progress [value]="group().percentage!" label="Linked activity completion" />
      }
      @if (group().missing) {
        <p class="warning small">
          {{ group().missing }} unavailable association(s). Completion is unverified; missing
          activities prevent readiness.
        </p>
      } @else if (group().ready) {
        <p class="ready small">{{ suggestion() || 'Activity group completed' }}</p>
      } @else {
        <p class="muted small">Activities in progress</p>
      }
    }
  </div>`,
  styles: [
    `
      .group {
        display: grid;
        gap: 10px;
        padding: 16px;
        border: 1px solid var(--border);
        border-radius: 12px;
      }
      .ready {
        color: var(--success);
      }
      .warning {
        color: var(--warning);
      }
    `,
  ],
})
export class SkillProgressCard {
  readonly group = input.required<SkillProgress>();
  readonly title = input.required<string>();
  readonly suggestion = input('');
}

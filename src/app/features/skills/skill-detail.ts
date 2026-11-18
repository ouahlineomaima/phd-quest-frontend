import { Component, computed, input, output } from '@angular/core';
import { Badge, Card } from '../../shared/components/ui';
import { SkillProgressCard } from './skill-progress';
import { PROFICIENCIES, SOURCE_LABELS } from './skill.models';
import type { ResearchSkill, SkillEvidence } from './skill.models';
import { SkillLevel } from '../../shared/models/domain.enums';
import type { TargetSkillLevel } from '../../shared/models/domain.enums';
@Component({
  selector: 'pq-skill-detail',
  standalone: true,
  imports: [Badge, Card, SkillProgressCard],
  templateUrl: './skill-detail.html',
  styleUrl: './skills.scss',
})
export class SkillDetail {
  readonly skill = input.required<ResearchSkill>();
  readonly categoryName = input.required<string>();
  readonly editable = input.required<boolean>();
  readonly busy = input(false);
  readonly edit = output<void>();
  readonly proficiency = output<void>();
  readonly archive = output<void>();
  readonly link = output<void>();
  readonly target = output<{ index: number; value: string }>();
  readonly unlink = output<number>();
  readonly evidence = output<SkillEvidence | null>();
  readonly removeEvidence = output<SkillEvidence>();
  readonly selected = output<string>();
  readonly returnToList = output<void>();
  readonly proficiencyNames = PROFICIENCIES;
  readonly sourceLabels = SOURCE_LABELS;
  readonly SkillLevel = SkillLevel;
  readonly targetLevels = [
    SkillLevel.Beginner,
    SkillLevel.Developing,
    SkillLevel.Proficient,
    SkillLevel.Advanced,
  ];
  readonly targetedGroups = computed(() => this.skill().targeted.filter((g) => g.total > 0));
  suggested(target: TargetSkillLevel): string {
    return target > this.skill().proficiency
      ? 'Ready to review Level ' + target + ' / ' + PROFICIENCIES[target]
      : 'Achieved activity milestone';
  }
}

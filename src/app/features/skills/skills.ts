import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Card, EmptyState, Loading, PageHeader, Badge } from '../../shared/components/ui';
import { Icon } from '../../shared/components/icon/icon';
import { StaleConflict } from '../../shared/components/stale-conflict';
import { EditorFeedback } from '../../shared/state/editor-feedback';
import { ResearchReferences } from '../../shared/state/research-references';
import { SkillsFacade } from './skills-facade';
import { SkillEditors } from './skill-editors';
import { SkillDetail } from './skill-detail';
import { PROFICIENCIES } from './skill.models';
import type { ResearchSkill } from './skill.models';
import { SKILL_LEVEL_VALUES } from '../../shared/models/domain.enums';
@Component({
  selector: 'pq-skills',
  standalone: true,
  providers: [SkillsFacade, EditorFeedback, ResearchReferences],
  imports: [
    Card,
    EmptyState,
    Loading,
    PageHeader,
    Badge,
    Icon,
    StaleConflict,
    SkillEditors,
    SkillDetail,
  ],
  templateUrl: './skills.html',
  styleUrl: './skills.scss',
})
export class Skills {
  readonly state = inject(SkillsFacade);
  readonly feedback = inject(EditorFeedback);
  private readonly destroy = inject(DestroyRef);
  private focusFrame = 0;
  readonly tree = this.state.tree;
  readonly current = this.state.current;
  readonly selectedId = this.state.selectedId;
  readonly loading = this.state.loading;
  readonly busy = computed(() => this.feedback.busy() || this.loading());
  readonly error = computed(() => this.state.error() || this.feedback.error());
  readonly success = this.feedback.success;
  readonly conflictDraft = this.feedback.conflictDraft;
  readonly latestRecord = this.feedback.latestRecord;
  readonly proficiencyNames = PROFICIENCIES;
  readonly allLevels = SKILL_LEVEL_VALUES;
  readonly search = signal('');
  readonly categoryFilter = signal('');
  readonly proficiencyFilter = signal('');
  readonly archived = signal('active');
  readonly sort = signal('custom');
  readonly view = signal('tree');
  readonly filtered = computed(() =>
    this.tree()
      .skills.filter((s) => {
        const category = this.tree().categories.find((c) => c.id === s.categoryId),
          historical = !!s.archivedAt || !category || !!category.archivedAt;
        return (
          (this.archived() === 'all' ||
            (this.archived() === 'archived' ? historical : !historical)) &&
          (!this.categoryFilter() || s.categoryId === this.categoryFilter()) &&
          (this.proficiencyFilter() === '' || String(s.proficiency) === this.proficiencyFilter()) &&
          s.name.toLowerCase().includes(this.search().toLowerCase())
        );
      })
      .sort((a, b) =>
        this.sort() === 'proficiency'
          ? b.proficiency - a.proficiency || a.name.localeCompare(b.name)
          : this.sort() === 'category'
            ? this.categoryName(a.categoryId).localeCompare(this.categoryName(b.categoryId)) ||
              a.sortOrder - b.sortOrder
            : a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      ),
  );
  readonly groups = computed(() => {
    const categories = [...this.tree().categories].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
    return [
      ...categories.map((category) => ({
        category,
        skills: this.filtered().filter((s) => s.categoryId === category.id),
      })),
      {
        category: {
          id: 'missing',
          name: 'Unavailable category',
          color: 'purple',
          icon: 'book',
          description: 'Historical skills whose category is unavailable',
          sortOrder: 999,
          archivedAt: 'historical',
        },
        skills: this.filtered().filter((s) => !categories.some((c) => c.id === s.categoryId)),
      },
    ].filter((g) => g.skills.length);
  });
  categoryName(id: string) {
    return this.tree().categories.find((c) => c.id === id)?.name ?? 'Unavailable category';
  }
  editable(skill: ResearchSkill) {
    const category = this.tree().categories.find((c) => c.id === skill.categoryId);
    return !skill.archivedAt && !!category && !category.archivedAt;
  }
  milestone(skill: ResearchSkill) {
    return skill.targeted?.some((g) => g.ready && g.targetLevel > skill.proficiency);
  }
  constructor() {
    this.state.load();
    this.destroy.onDestroy(() => cancelAnimationFrame(this.focusFrame));
  }
  load(): void {
    this.state.load();
  }
  select(id: string): void {
    this.selectedId.set(id);
    cancelAnimationFrame(this.focusFrame);
    this.focusFrame = requestAnimationFrame(() => {
      const panel = document.getElementById('skill-details');
      panel?.focus({ preventScroll: true });
      panel?.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'start',
      });
    });
  }
  returnToList(): void {
    (
      document.getElementById('skill-node-' + this.selectedId()) ??
      document.getElementById('skill-search')
    )?.focus();
  }
  inspectLatest(): void {
    this.feedback.inspectLatest();
  }
  discardDraft(): void {
    this.feedback.discardDraft();
  }
}

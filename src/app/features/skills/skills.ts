import {
  SkillLevel,
  SkillSourceType,
  EvidenceType,
  SKILL_LEVEL_VALUES,
  TARGET_LEVELS,
  TargetSkillLevel,
} from '../../shared/models/domain.enums';
import { StaleConflict } from '../../shared/components/stale-conflict';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Observable } from 'rxjs';
import { Badge, Card, EmptyState, Loading, PageHeader } from '../../shared/components/ui';
import { Icon } from '../../shared/components/icon/icon';
import {
  ResearchApi,
  Goal,
  ResearchLevel,
  researchError,
  staleRecord,
} from '../../core/services/research-api';
import { TaskLinksPicker } from '../goals/task-links-picker';
import {
  Association,
  AssociationInput,
  SKILL_ICONS,
  SKILL_COLORS,
  SkillIcon,
  SkillColor,
  PROFICIENCIES,
  ResearchSkill,
  SkillCategory,
  SkillEvidence,
  SkillTree,
  SOURCE_LABELS,
} from './skill.models';
import { SkillProgressCard } from './skill-progress';
@Component({
  selector: 'pq-skills',
  standalone: true,
  imports: [
    StaleConflict,
    Badge,
    Card,
    EmptyState,
    Loading,
    PageHeader,
    Icon,
    TaskLinksPicker,
    SkillProgressCard,
  ],
  templateUrl: './skills.html',
  styleUrl: './skills.scss',
})
export class Skills {
  readonly conflictDraft = signal('');
  readonly latestRecord = signal('');
  private conflictPath = '';
  private draftVersion?: string;
  private readonly api = inject(ResearchApi);
  private readonly destroy = inject(DestroyRef);
  readonly tree = signal<SkillTree>({ initialized: false, categories: [], skills: [] });
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly selectedId = signal('');
  readonly search = signal('');
  readonly categoryFilter = signal('');
  readonly proficiencyFilter = signal('');
  readonly archived = signal('active');
  readonly sort = signal('custom');
  readonly view = signal('tree');
  readonly goals = signal<Goal[]>([]);
  readonly levels = signal<ResearchLevel[]>([]);
  readonly pickerOpen = signal(false);
  readonly taskSelection = signal<string[]>([]);
  readonly proficiencyNames = PROFICIENCIES;
  readonly proficiencyMeanings = [
    'No demonstrated experience yet',
    'Understands foundational concepts',
    'Can apply concepts with some guidance',
    'Can work independently',
    'Can critically evaluate, adapt and explain approaches',
  ];
  readonly sourceLabels = SOURCE_LABELS;
  readonly targetLevels = TARGET_LEVELS;
  readonly allLevels = SKILL_LEVEL_VALUES;
  readonly icons = SKILL_ICONS;
  readonly colors = SKILL_COLORS;
  readonly SkillSourceType = SkillSourceType;
  readonly SkillLevel = SkillLevel;
  readonly current = computed(
    () => this.tree().skills.find((s) => s.id === this.selectedId()) ?? null,
  );
  readonly filtered = computed(() =>
    this.tree()
      .skills.filter((s) => {
        const category = this.tree().categories.find((c) => c.id === s.categoryId),
          historical = !!s.archivedAt || !category || !!category.archivedAt;
        return (
          (this.archived() === 'all' ||
            (this.archived() === 'archived' ? historical : !historical)) &&
          (!this.categoryFilter() || s.categoryId === this.categoryFilter()) &&
          (this.proficiencyFilter() === '' || s.proficiency === Number(this.proficiencyFilter())) &&
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
  editingCategory: SkillCategory | null = null;
  categoryForm = {
    name: '',
    description: '',
    icon: 'book' as SkillIcon,
    color: 'purple' as SkillColor,
    sortOrder: 0,
  };
  editingSkill: ResearchSkill | null = null;
  skillForm = {
    name: '',
    description: '',
    categoryId: '',
    sortOrder: 0,
    prerequisiteIds: [] as string[],
  };
  proficiency: SkillLevel = SkillLevel.NotStarted;
  justification = '';
  confirmed = false;
  sourceType: SkillSourceType = SkillSourceType.WeeklyTask;
  sourceId = '';
  targetLevel = '';
  editingEvidence: SkillEvidence | null = null;
  evidenceForm = { title: '', type: EvidenceType.Note, description: '', url: '' };
  confirmTitle = '';
  confirmText = '';
  private confirmWork: (() => void) | null = null;
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      tree: this.api.skills(),
      goals: this.api.get<Goal[]>('goals'),
      levels: this.api.get<ResearchLevel[]>('roadmap'),
    })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          this.tree.set(data.tree);
          this.goals.set(data.goals);
          this.levels.set(data.levels);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(researchError(e));
          this.loading.set(false);
        },
      });
  }
  categoryName(id: string) {
    return this.tree().categories.find((c) => c.id === id)?.name ?? 'Unavailable category';
  }
  editable(skill: ResearchSkill) {
    const category = this.tree().categories.find((c) => c.id === skill.categoryId);
    return !skill.archivedAt && !!category && !category.archivedAt;
  }
  select(id: string) {
    this.selectedId.set(id);
    requestAnimationFrame(() =>
      document.getElementById('skill-details')?.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'start',
      }),
    );
  }
  targetedGroups(skill: ResearchSkill) {
    return skill.targeted.filter((group) => group.total > 0);
  }
  suggested(skill: ResearchSkill, target: TargetSkillLevel) {
    return target > skill.proficiency
      ? `Ready to review Level ${target} — ${PROFICIENCIES[target]}`
      : 'Achieved activity milestone';
  }
  milestone(skill: ResearchSkill) {
    return skill.targeted?.some((g) => g.ready && g.targetLevel > skill.proficiency);
  }
  initialize() {
    this.mutate('POST', 'initialize', {});
  }
  openCategory(category: SkillCategory | null, dialog: HTMLDialogElement) {
    this.draftVersion = category?.editVersion;
    this.editingCategory = category;
    this.categoryForm = category
      ? {
          name: category.name,
          description: category.description,
          icon: category.icon,
          color: category.color,
          sortOrder: category.sortOrder,
        }
      : {
          name: '',
          description: '',
          icon: 'book' as SkillIcon,
          color: 'purple' as SkillColor,
          sortOrder: this.tree().categories.length,
        };
    this.conflictDraft.set('');
    this.latestRecord.set('');
    this.error.set('');
    dialog.showModal();
  }
  saveCategory(event: Event, dialog: HTMLDialogElement) {
    event.preventDefault();
    this.mutate(
      this.editingCategory ? 'PATCH' : 'POST',
      'categories' + (this.editingCategory ? '/' + this.editingCategory.id : ''),
      this.categoryForm,
      dialog,
    );
  }
  openSkill(skill: ResearchSkill | null, dialog: HTMLDialogElement) {
    this.draftVersion = skill?.editVersion;
    this.editingSkill = skill;
    this.skillForm = skill
      ? {
          name: skill.name,
          description: skill.description,
          categoryId: skill.categoryId,
          sortOrder: skill.sortOrder,
          prerequisiteIds: [...skill.prerequisiteIds],
        }
      : {
          name: '',
          description: '',
          categoryId: this.tree().categories.find((c) => !c.archivedAt)?.id ?? '',
          sortOrder: this.tree().skills.length,
          prerequisiteIds: [],
        };
    this.conflictDraft.set('');
    this.latestRecord.set('');
    this.error.set('');
    dialog.showModal();
  }
  unavailablePrerequisites() {
    return this.skillForm.prerequisiteIds.filter(
      (id) => !this.tree().skills.some((skill) => skill.id === id),
    );
  }
  togglePrerequisite(id: string, checked: boolean) {
    this.skillForm.prerequisiteIds = this.skillForm.prerequisiteIds.filter((p) => p !== id);
    if (checked) this.skillForm.prerequisiteIds.push(id);
  }
  saveSkill(event: Event, dialog: HTMLDialogElement) {
    event.preventDefault();
    this.mutate(
      this.editingSkill ? 'PATCH' : 'POST',
      this.editingSkill ? this.editingSkill.id : '',
      this.skillForm,
      dialog,
    );
  }
  openProficiency(dialog: HTMLDialogElement) {
    this.draftVersion = this.current()?.editVersion;
    this.proficiency = this.current()!.proficiency;
    this.justification = '';
    this.confirmed = false;
    this.conflictDraft.set('');
    this.latestRecord.set('');
    this.error.set('');
    dialog.showModal();
  }
  saveProficiency(event: Event, dialog: HTMLDialogElement) {
    event.preventDefault();
    if (this.confirmed)
      this.mutate(
        'PATCH',
        this.current()!.id + '/proficiency',
        { level: Number(this.proficiency), confirm: true, justification: this.justification },
        dialog,
      );
  }
  openLink(dialog: HTMLDialogElement) {
    this.draftVersion = this.current()?.editVersion;
    this.taskSelection.set([]);
    this.sourceType = SkillSourceType.WeeklyTask;
    this.sourceId = '';
    this.targetLevel = '';
    this.pickerOpen.set(true);
    this.conflictDraft.set('');
    this.latestRecord.set('');
    this.error.set('');
    dialog.showModal();
  }
  hasSource(type: SkillSourceType, id: string) {
    return (
      this.current()?.associations.some((a) => a.sourceType === type && a.sourceId === id) ?? false
    );
  }
  saveLinks(event: Event, dialog: HTMLDialogElement) {
    event.preventDefault();
    const skill = this.current()!,
      ids =
        this.sourceType === SkillSourceType.WeeklyTask
          ? this.taskSelection()
          : [this.sourceId].filter(Boolean);
    if (!ids.length) {
      this.error.set('Choose at least one activity.');
      return;
    }
    if (ids.some((id) => this.hasSource(this.sourceType, id))) {
      this.error.set(
        'An activity can be linked only once per skill. Edit the existing target instead.',
      );
      return;
    }
    const additions: AssociationInput[] = ids.map((sourceId) => {
      const checkpointIdentity =
        this.sourceType === SkillSourceType.RoadmapCheckpoint
          ? this.levels()
              .flatMap((l) =>
                l.checkpoints.map((c) => ({
                  sourceId: l.levelNumber + ':' + c.id,
                  checkpointIdentity: c.checkpointIdentity,
                })),
              )
              .find((c) => c.sourceId === sourceId)?.checkpointIdentity
          : undefined;
      return {
        sourceType: this.sourceType,
        sourceId,
        targetLevel: this.targetLevel ? (Number(this.targetLevel) as TargetSkillLevel) : null,
        ...(checkpointIdentity ? { checkpointIdentity } : {}),
      };
    });
    this.saveAssociations([...skill.associations, ...additions], dialog);
  }
  private cleanAssociations(rows: AssociationInput[]) {
    return rows.map(({ sourceType, sourceId, targetLevel, checkpointIdentity }) => ({
      sourceType,
      sourceId,
      targetLevel: targetLevel ?? null,
      ...(checkpointIdentity ? { checkpointIdentity } : {}),
    }));
  }
  private saveAssociations(rows: AssociationInput[], dialog?: HTMLDialogElement) {
    this.mutate(
      'PATCH',
      this.current()!.id,
      { associations: this.cleanAssociations(rows) },
      dialog,
    );
  }
  changeTarget(index: number, value: string) {
    const rows = this.current()!.associations.map((a, i) =>
      i === index ? { ...a, targetLevel: value ? (Number(value) as TargetSkillLevel) : null } : a,
    );
    this.saveAssociations(rows);
  }
  unlink(index: number, dialog: HTMLDialogElement) {
    this.ask(
      'Remove activity link?',
      'Only this association is removed. The source activity and confirmed proficiency stay intact.',
      dialog,
      () => this.saveAssociations(this.current()!.associations.filter((_, i) => i !== index)),
    );
  }
  openEvidence(entry: SkillEvidence | null, dialog: HTMLDialogElement) {
    this.draftVersion = this.current()?.editVersion;
    this.editingEvidence = entry;
    this.evidenceForm = {
      title: entry?.title ?? '',
      type: entry?.type ?? EvidenceType.Note,
      description: entry?.description ?? '',
      url: entry?.url ?? '',
    };
    this.conflictDraft.set('');
    this.latestRecord.set('');
    this.error.set('');
    dialog.showModal();
  }
  saveEvidence(event: Event, dialog: HTMLDialogElement) {
    event.preventDefault();
    const body = {
      ...this.evidenceForm,
      ...(this.evidenceForm.type === EvidenceType.Note ? { url: null } : {}),
    };
    this.mutate(
      this.editingEvidence ? 'PATCH' : 'POST',
      this.current()!.id +
        '/evidence' +
        (this.editingEvidence ? '/' + this.editingEvidence.id : ''),
      body,
      dialog,
    );
  }
  removeEvidence(entry: SkillEvidence, dialog: HTMLDialogElement) {
    this.ask(
      'Remove evidence?',
      'This removes the evidence entry without changing proficiency or activity progress.',
      dialog,
      () => this.mutate('DELETE', this.current()!.id + '/evidence/' + entry.id, {}),
    );
  }
  archiveCategory(category: SkillCategory, dialog: HTMLDialogElement) {
    this.ask(
      'Archive ' + category.name + '?',
      'Its skills and history are preserved, excluded from active counts and available in archived views.',
      dialog,
      () => this.mutate('PATCH', 'categories/' + category.id + '/archive', {}),
    );
  }
  archiveSkill(skill: ResearchSkill, dialog: HTMLDialogElement) {
    this.ask(
      'Archive ' + skill.name + '?',
      'Evidence, prerequisites, links and proficiency history remain available as read-only history.',
      dialog,
      () => this.mutate('PATCH', skill.id + '/archive', {}),
    );
  }
  ask(title: string, text: string, dialog: HTMLDialogElement, work: () => void) {
    this.confirmTitle = title;
    this.confirmText = text;
    this.confirmWork = work;
    this.conflictDraft.set('');
    this.latestRecord.set('');
    this.error.set('');
    dialog.showModal();
  }
  confirm(dialog: HTMLDialogElement) {
    dialog.close();
    this.confirmWork?.();
    this.confirmWork = null;
  }
  inspectLatest() {
    if (this.busy()) return;
    this.busy.set(true);
    const parts = this.conflictPath.split('/');
    const record: Observable<SkillTree | ResearchSkill> =
      parts[1] === 'categories' ? this.api.skills() : this.api.skill(parts[1]);
    record.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (r) => {
        this.latestRecord.set(
          JSON.stringify(
            'categories' in r ? r.categories.find((c) => c.id === parts[2]) : r,
            null,
            2,
          ),
        );
        this.busy.set(false);
      },
      error: (e) => {
        this.error.set(researchError(e));
        this.busy.set(false);
      },
    });
  }
  discardDraft() {
    document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach((d) => d.close());
    this.conflictDraft.set('');
    this.latestRecord.set('');
    this.draftVersion = undefined;
    this.load();
  }
  private mutate(
    method: 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body: unknown,
    dialog?: HTMLDialogElement,
  ) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    const parts = path.split('/');
    const version =
      parts[0] === 'categories'
        ? dialog
          ? this.draftVersion
          : this.tree().categories.find((c) => c.id === parts[1])?.editVersion
        : dialog
          ? this.draftVersion
          : this.tree().skills.find((c) => c.id === parts[0])?.editVersion;
    this.api
      .change(method, 'research-skills' + (path ? '/' + path : ''), body, version)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.busy.set(false);
          dialog?.close();
          this.pickerOpen.set(false);
          this.success.set('Skill Tree changes saved.');
          this.load();
        },
        error: (e) => {
          this.busy.set(false);
          if (staleRecord(e)) {
            this.conflictDraft.set(JSON.stringify(body, null, 2));
            this.latestRecord.set('');
            this.conflictPath = 'research-skills' + (path ? '/' + path : '');
          }
          this.error.set(researchError(e));
        },
      });
  }
}

import {
  Component,
  ChangeDetectorRef,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { StaleConflict } from '../../shared/components/stale-conflict';
import { ReferenceStatusNotice } from '../../shared/components/reference-status';
import { TaskLinksPicker } from '../goals/task-links-picker';
import { EditorFeedback } from '../../shared/state/editor-feedback';
import { ResearchReferences } from '../../shared/state/research-references';
import { SkillsFacade } from './skills-facade';
import { PROFICIENCIES, SKILL_ICONS, SKILL_COLORS } from './skill.models';
import type {
  ResearchSkill,
  SkillCategory,
  SkillEvidence,
  AssociationInput,
  SkillIcon,
  SkillColor,
} from './skill.models';
import {
  SkillLevel,
  SkillSourceType,
  EvidenceType,
  SKILL_LEVEL_VALUES,
  TARGET_LEVELS,
} from '../../shared/models/domain.enums';
import type { TargetSkillLevel } from '../../shared/models/domain.enums';
@Component({
  selector: 'pq-skill-editors',
  standalone: true,
  imports: [StaleConflict, ReferenceStatusNotice, TaskLinksPicker],
  templateUrl: './skill-editors.html',
  styleUrl: './skills.scss',
})
export class SkillEditors {
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly state = inject(SkillsFacade);
  readonly feedback = inject(EditorFeedback);
  readonly references = inject(ResearchReferences);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly tree = this.state.tree;
  readonly current = this.state.current;
  readonly busy = this.feedback.busy;
  readonly error = this.feedback.error;
  readonly conflictDraft = this.feedback.conflictDraft;
  readonly latestRecord = this.feedback.latestRecord;
  readonly goals = this.references.goals.data;
  readonly levels = this.references.roadmap.data;
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
  readonly targetLevels = TARGET_LEVELS;
  readonly allLevels = SKILL_LEVEL_VALUES;
  readonly icons = SKILL_ICONS;
  readonly colors = SKILL_COLORS;
  readonly SkillSourceType = SkillSourceType;
  private draftVersion?: string;
  private opener: HTMLElement | null = null;
  private readonly pendingFocus = signal<{ opener: HTMLElement | null } | null>(null);
  private focusFrame = 0;
  constructor() {
    effect(() => {
      const pending = this.pendingFocus();
      if (!pending || this.state.loading() || this.busy()) return;
      cancelAnimationFrame(this.focusFrame);
      this.focusFrame = requestAnimationFrame(() => {
        if (this.state.loading() || this.busy()) return;
        const opener = pending.opener;
        const target =
          opener?.isConnected && !opener.matches(':disabled') && opener.getClientRects().length
            ? opener
            : document.getElementById(this.current() ? 'skill-details' : 'skill-manage-categories');
        target?.focus();
        this.pendingFocus.set(null);
      });
    });
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.focusFrame));
  }

  private readonly categoriesDialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('categoriesDialog');
  private readonly skillEditor = viewChild.required<ElementRef<HTMLDialogElement>>('skillEditor');
  private readonly categoryEditor =
    viewChild.required<ElementRef<HTMLDialogElement>>('categoryEditor');
  private readonly proficiencyDialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('proficiencyDialog');
  private readonly linkDialog = viewChild.required<ElementRef<HTMLDialogElement>>('linkDialog');
  private readonly evidenceDialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('evidenceDialog');
  private readonly confirmDialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('confirmDialog');
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
          icon: 'book',
          color: 'purple',
          sortOrder: this.tree().categories.length,
        };
    this.conflictDraft.set('');
    this.latestRecord.set('');
    this.error.set('');
    this.openDialog(dialog);
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
    this.openDialog(dialog);
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
    this.openDialog(dialog);
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
    this.openDialog(dialog);
  }
  hasSource(type: SkillSourceType, id: string) {
    return (
      this.current()?.associations.some((a) => a.sourceType === type && a.sourceId === id) ?? false
    );
  }
  saveLinks(event: Event, dialog: HTMLDialogElement) {
    event.preventDefault();
    if (
      (this.sourceType === SkillSourceType.ResearchGoal && !this.references.goals.ready()) ||
      (this.sourceType === SkillSourceType.RoadmapCheckpoint && !this.references.roadmap.ready())
    ) {
      this.error.set('Retry loading activity options before adding a link.');
      return;
    }
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
        targetLevel: this.targetLevel ? Number(this.targetLevel) : null,
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
    this.openDialog(dialog);
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
    this.openDialog(dialog);
  }
  confirm(dialog: HTMLDialogElement) {
    this.closeDialog(dialog);
    this.confirmWork?.();
    this.confirmWork = null;
  }
  manageCategories(): void {
    this.openDialog(this.categoriesDialog().nativeElement);
  }
  editSkill(skill: ResearchSkill | null): void {
    this.openSkill(skill, this.skillEditor().nativeElement);
  }
  editCategory(category: SkillCategory | null): void {
    this.openCategory(category, this.categoryEditor().nativeElement);
  }
  confirmProficiency(): void {
    this.openProficiency(this.proficiencyDialog().nativeElement);
  }
  linkActivity(): void {
    this.openLink(this.linkDialog().nativeElement);
  }
  editEvidence(entry: SkillEvidence | null): void {
    this.openEvidence(entry, this.evidenceDialog().nativeElement);
  }
  confirmArchiveSkill(skill: ResearchSkill): void {
    this.archiveSkill(skill, this.confirmDialog().nativeElement);
  }
  confirmUnlink(index: number): void {
    this.unlink(index, this.confirmDialog().nativeElement);
  }
  confirmRemoveEvidence(entry: SkillEvidence): void {
    this.removeEvidence(entry, this.confirmDialog().nativeElement);
  }
  changeSource(value: SkillSourceType): void {
    this.sourceType = value;
    this.sourceId = '';
    if (value === SkillSourceType.ResearchGoal) this.references.goals.load();
    if (value === SkillSourceType.RoadmapCheckpoint) this.references.roadmap.load();
  }
  private openDialog(dialog: HTMLDialogElement): void {
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Editors are opened imperatively by a sibling presentation component.
    // Mark their local form fields for the default OnPush view.
    this.changeDetector.markForCheck();
    dialog.showModal();
  }
  private closeDialog(dialog?: HTMLDialogElement): void {
    if (!dialog) return;
    dialog.close();
    this.pendingFocus.set({ opener: this.opener });
  }
  inspectLatest(): void {
    this.feedback.inspectLatest();
  }
  discardDraft(): void {
    this.feedback.discardDraft();
  }
  private discardAll(): void {
    this.element.nativeElement
      .querySelectorAll<HTMLDialogElement>('dialog[open]')
      .forEach((dialog) => this.closeDialog(dialog));
    this.pickerOpen.set(false);
    this.draftVersion = undefined;
    this.state.load();
  }
  initialize(): void {
    this.mutate('POST', 'initialize', {});
  }
  private mutate(
    method: 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body: unknown,
    dialog?: HTMLDialogElement,
  ): void {
    const parts = path.split('/');
    const version =
      parts[0] === 'categories'
        ? dialog
          ? this.draftVersion
          : this.tree().categories.find((c) => c.id === parts[1])?.editVersion
        : dialog
          ? this.draftVersion
          : this.tree().skills.find((c) => c.id === parts[0])?.editVersion;
    this.feedback.save(
      () => this.state.change(method, path, body, version),
      body,
      () => {
        this.closeDialog(dialog);
        this.pickerOpen.set(false);
        this.state.load();
      },
      () => this.state.inspect(path),
      () => this.discardAll(),
    );
  }
}

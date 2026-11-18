import {
  Component,
  ChangeDetectorRef,
  DestroyRef,
  effect,
  ElementRef,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { StaleConflict } from '../../shared/components/stale-conflict';
import { ReferenceStatusNotice } from '../../shared/components/reference-status';
import { EditorFeedback } from '../../shared/state/editor-feedback';
import { ResearchReferences } from '../../shared/state/research-references';
import { TaskLinksPicker } from '../goals/task-links-picker';
import type { LinkedTask } from '../../core/services/research-api';
import type { Meeting, MeetingAction, Supervisor, CheckpointRef } from './meeting.models';
import { MeetingsFacade } from './meetings-facade';
function blankMeeting() {
  return {
    title: '',
    scheduledLocal: '',
    plannedDurationMinutes: '',
    type: 'online',
    location: '',
    supervisorIds: [] as string[],
    notes: { agenda: '', discussion: '', feedback: '', decisions: '' },
    goalIds: [] as string[],
    checkpointRefs: [] as CheckpointRef[],
    documents: [] as { label: string; url: string }[],
  };
}
@Component({
  selector: 'pq-meeting-editors',
  standalone: true,
  imports: [StaleConflict, ReferenceStatusNotice, TaskLinksPicker],
  templateUrl: './meeting-editors.html',
  styleUrl: './supervisor-meetings.scss',
})
export class MeetingEditors {
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly state = inject(MeetingsFacade);
  readonly feedback = inject(EditorFeedback);
  readonly references = inject(ResearchReferences);
  private readonly router = inject(Router);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly tab = input('upcoming');
  readonly actions = this.state.actions;
  readonly current = this.state.current;
  readonly meetings = this.state.meetings;
  readonly supervisors = this.state.supervisors;
  readonly goals = this.references.goals.data;
  readonly levels = this.references.roadmap.data;
  readonly activeSupervisors = computed(() => this.supervisors().filter((s) => !s.archivedAt));
  readonly busy = this.feedback.busy;
  readonly error = this.feedback.error;
  readonly conflictDraft = this.feedback.conflictDraft;
  readonly latestRecord = this.feedback.latestRecord;
  readonly actionEditorOpen = signal(false);
  readonly taskIds = signal<string[]>([]);
  private draftVersion?: string;
  private actionVersions: Record<string, string> = {};
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
            : document.getElementById('meeting-refresh');
        target?.focus();
        this.pendingFocus.set(null);
      });
    });
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.focusFrame));
  }

  private readonly supervisorEditor =
    viewChild.required<ElementRef<HTMLDialogElement>>('supervisorEditor');
  private readonly meetingEditor =
    viewChild.required<ElementRef<HTMLDialogElement>>('meetingEditor');
  private readonly actionEditor = viewChild.required<ElementRef<HTMLDialogElement>>('actionEditor');
  private readonly confirmDialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('confirmDialog');
  actionParentId = '';
  meetingForm = blankMeeting();
  editingMeeting: Meeting | null = null;
  editingSupervisor: Supervisor | null = null;
  supervisorForm = { name: '', role: 'primary', institution: '', email: '', notes: '' };
  editingAction: MeetingAction | null = null;
  actionForm = { title: '', description: '', phase: 'pre_meeting', dueDate: '', status: 'pending' };
  confirmTitle = '';
  confirmMessage = '';
  private confirmed: (() => void) | null = null;
  readonly noteSections = [
    ['agenda', 'Agenda'],
    ['discussion', 'Discussion notes'],
    ['feedback', 'Supervisor feedback'],
    ['decisions', 'Decisions'],
  ] as const;
  openSupervisor(profile: Supervisor | null, dialog: HTMLDialogElement) {
    this.draftVersion = profile?.editVersion;
    this.editingSupervisor = profile;
    this.supervisorForm = {
      name: profile?.name ?? '',
      role: profile?.role ?? 'primary',
      institution: profile?.institution ?? '',
      email: profile?.email ?? '',
      notes: profile?.notes ?? '',
    };
    this.conflictDraft.set('');
    this.latestRecord.set('');
    this.error.set('');
    this.openDialog(dialog);
  }
  saveSupervisor(event: Event, dialog: HTMLDialogElement) {
    event.preventDefault();
    this.mutate(
      this.editingSupervisor ? 'PATCH' : 'POST',
      'supervisors' + (this.editingSupervisor ? '/' + this.editingSupervisor.id : ''),
      this.supervisorForm,
      dialog,
    );
  }
  openMeeting(meeting: Meeting | null, dialog: HTMLDialogElement) {
    this.draftVersion = meeting?.editVersion;
    this.editingMeeting = meeting;
    this.state.profiles.load();
    this.references.goals.load();
    this.references.roadmap.load();
    this.meetingForm = meeting
      ? {
          title: meeting.title,
          scheduledLocal: meeting.scheduledLocal,
          plannedDurationMinutes: meeting.plannedDurationMinutes?.toString() ?? '',
          type: meeting.type,
          location: meeting.location,
          supervisorIds: [...meeting.supervisorIds],
          notes: { ...meeting.notes },
          goalIds: [...meeting.goalIds],
          checkpointRefs: meeting.checkpointRefs.map((r) => ({ ...r })),
          documents: meeting.documents.map((d) => ({ ...d })),
        }
      : blankMeeting();
    this.conflictDraft.set('');
    this.latestRecord.set('');
    this.error.set('');
    this.openDialog(dialog);
  }
  saveMeeting(event: Event, dialog: HTMLDialogElement) {
    event.preventDefault();
    try {
      const { scheduledLocal, plannedDurationMinutes, ...fields } = this.meetingForm;
      this.mutate(
        this.editingMeeting ? 'PATCH' : 'POST',
        'supervisor-meetings' + (this.editingMeeting ? '/' + this.editingMeeting.id : ''),
        {
          ...fields,
          scheduledLocal,
          plannedDurationMinutes: plannedDurationMinutes ? Number(plannedDurationMinutes) : null,
        },
        dialog,
        !this.editingMeeting,
      );
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Check the meeting date.');
    }
  }
  toggle(list: string[], id: string, checked: boolean) {
    if (checked && !list.includes(id)) list.push(id);
    if (!checked) {
      const i = list.indexOf(id);
      if (i >= 0) list.splice(i, 1);
    }
  }
  hasCheckpoint(levelNumber: number, checkpointId: string) {
    const identity = this.levels()
      .find((l) => l.levelNumber === levelNumber)
      ?.checkpoints.find((c) => c.id === checkpointId)?.checkpointIdentity;
    return this.meetingForm.checkpointRefs.some(
      (r) =>
        r.levelNumber === levelNumber &&
        r.checkpointId === checkpointId &&
        !!identity &&
        r.checkpointIdentity === identity,
    );
  }
  historicalCheckpoint(levelNumber: number, checkpointId: string): boolean {
    return (
      this.editingMeeting?.linkedCheckpoints.some(
        (r) =>
          r.levelNumber === levelNumber &&
          r.checkpointId === checkpointId &&
          r.resolution !== 'resolved',
      ) ?? false
    );
  }
  toggleCheckpoint(levelNumber: number, checkpointId: string, checked: boolean): void {
    this.meetingForm.checkpointRefs = this.meetingForm.checkpointRefs.filter(
      (r) => r.levelNumber !== levelNumber || r.checkpointId !== checkpointId,
    );
    if (
      checked &&
      this.references.roadmap.ready() &&
      !this.historicalCheckpoint(levelNumber, checkpointId)
    ) {
      const checkpointIdentity = this.levels()
        .find((l) => l.levelNumber === levelNumber)
        ?.checkpoints.find((c) => c.id === checkpointId)?.checkpointIdentity;
      this.meetingForm.checkpointRefs.push({
        levelNumber,
        checkpointId,
        ...(checkpointIdentity ? { checkpointIdentity } : {}),
      });
    }
  }
  missingGoals(): string[] {
    return this.references.goals.ready()
      ? this.meetingForm.goalIds.filter((id) => !this.goals().some((g) => g.id === id))
      : [];
  }
  missingCheckpoints(): CheckpointRef[] {
    return this.meetingForm.checkpointRefs.filter(
      (ref) =>
        this.historicalCheckpoint(ref.levelNumber, ref.checkpointId) ||
        (this.references.roadmap.ready() &&
          !this.levels().some(
            (l) =>
              l.levelNumber === ref.levelNumber &&
              l.checkpoints.some((c) => c.id === ref.checkpointId),
          )),
    );
  }
  historicalLabel(ref: CheckpointRef): string {
    return this.editingMeeting?.linkedCheckpoints.find(
      (r) => r.levelNumber === ref.levelNumber && r.checkpointId === ref.checkpointId,
    )?.resolution === 'unverified'
      ? 'Unverified historical checkpoint'
      : 'Unavailable checkpoint';
  }
  openAction(action: MeetingAction | null, dialog: HTMLDialogElement, phase = 'pre_meeting') {
    this.draftVersion = action?.meetingVersion ?? this.current()?.editVersion;
    this.actionVersions = Object.fromEntries(this.meetings().map((m) => [m.id, m.editVersion]));
    this.editingAction = action;
    this.actionParentId = action?.meetingId ?? this.current()?.id ?? '';
    this.actionForm = action
      ? {
          title: action.title,
          description: action.description,
          phase: action.phase,
          dueDate: action.dueDate ?? '',
          status: action.status,
        }
      : { title: '', description: '', phase, dueDate: '', status: 'pending' };
    this.taskIds.set([...(action?.linkedTaskIds ?? [])]);
    this.actionEditorOpen.set(true);
    this.conflictDraft.set('');
    this.latestRecord.set('');
    this.error.set('');
    this.openDialog(dialog);
  }
  existingTasks(): LinkedTask[] {
    return (this.editingAction?.linkedTasks ?? []).filter(
      (t): t is LinkedTask => t.status !== null,
    );
  }
  saveAction(event: Event, dialog: HTMLDialogElement) {
    event.preventDefault();
    const meetingId = this.editingAction?.meetingId ?? this.current()?.id ?? this.actionParentId;
    if (!meetingId) return;
    this.mutate(
      this.editingAction ? 'PATCH' : 'POST',
      `supervisor-meetings/${meetingId}/actions` +
        (this.editingAction ? '/' + this.editingAction.id : ''),
      {
        ...this.actionForm,
        dueDate: this.actionForm.dueDate || null,
        linkedTaskIds: this.taskIds(),
      },
      dialog,
    );
  }
  changeStatus(status: string) {
    const meeting = this.current();
    if (meeting) this.mutate('PATCH', `supervisor-meetings/${meeting.id}/status`, { status });
  }
  ask(title: string, message: string, dialog: HTMLDialogElement, work: () => void) {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmed = work;
    this.conflictDraft.set('');
    this.latestRecord.set('');
    this.error.set('');
    this.openDialog(dialog);
  }
  confirm(dialog: HTMLDialogElement) {
    this.closeDialog(dialog);
    this.confirmed?.();
    this.confirmed = null;
  }
  archiveSupervisor(profile: Supervisor, dialog: HTMLDialogElement) {
    this.ask(
      'Archive ' + profile.name + '?',
      'Historical meetings keep this supervisor. Archived profiles cannot be selected for new meetings.',
      dialog,
      () => this.mutate('PATCH', `supervisors/${profile.id}/archive`, {}),
    );
  }
  archiveMeeting(dialog: HTMLDialogElement) {
    const meeting = this.current();
    if (meeting)
      this.ask(
        'Archive ' + meeting.title + '?',
        'Notes, decisions, supervisors and actions remain available in archived history.',
        dialog,
        () => this.mutate('PATCH', `supervisor-meetings/${meeting.id}/archive`, {}),
      );
  }
  removeAction(action: MeetingAction, dialog: HTMLDialogElement) {
    this.ask(
      'Remove ' + action.title + '?',
      'This removes only the meeting action. Linked weekly tasks and research progress stay intact.',
      dialog,
      () =>
        this.mutate('DELETE', `supervisor-meetings/${action.meetingId}/actions/${action.id}`, {}),
    );
  }
  timezone(): string {
    return this.state.timezone();
  }
  editSupervisor(profile: Supervisor | null): void {
    this.openSupervisor(profile, this.supervisorEditor().nativeElement);
  }
  editMeeting(meeting: Meeting | null): void {
    this.openMeeting(meeting, this.meetingEditor().nativeElement);
  }
  editAction(action: MeetingAction | null, phase = 'pre_meeting'): void {
    this.openAction(action, this.actionEditor().nativeElement, phase);
  }
  confirmArchiveSupervisor(profile: Supervisor): void {
    this.archiveSupervisor(profile, this.confirmDialog().nativeElement);
  }
  confirmArchiveMeeting(): void {
    this.archiveMeeting(this.confirmDialog().nativeElement);
  }
  confirmRemoveAction(action: MeetingAction): void {
    this.removeAction(action, this.confirmDialog().nativeElement);
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
    this.actionEditorOpen.set(false);
    this.draftVersion = undefined;
    this.state.reload();
  }
  private mutate(
    method: 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body: unknown,
    dialog?: HTMLDialogElement,
    navigate = false,
  ): void {
    const parts = path.split('/');
    const version = dialog
      ? parts[2] === 'actions'
        ? this.editingAction || this.current()
          ? this.draftVersion
          : this.actionVersions[this.actionParentId]
        : this.draftVersion
      : parts[0] === 'supervisors'
        ? this.supervisors().find((s) => s.id === parts[1])?.editVersion
        : this.current()?.id === parts[1]
          ? this.current()!.editVersion
          : (this.meetings().find((m) => m.id === parts[1])?.editVersion ??
            this.actions().find((a) => a.meetingId === parts[1])?.meetingVersion);
    this.feedback.save(
      () => this.state.change(method, path, body, version),
      body,
      (result) => {
        this.closeDialog(dialog);
        this.actionEditorOpen.set(false);
        if (navigate) void this.router.navigate(['/supervisor-meetings', result.id]);
        else this.state.afterChange(path, this.tab());
      },
      () => this.state.inspect(path),
      () => this.discardAll(),
    );
  }
}

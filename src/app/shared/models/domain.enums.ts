// Canonical wire values; compatibility is checked against docs/contracts/domain-values.v1.json.
export enum SkillLevel { NotStarted=0, Beginner=1, Developing=2, Proficient=3, Advanced=4 }
export enum SkillSourceType { WeeklyTask='weekly_task', ResearchGoal='research_goal', RoadmapCheckpoint='roadmap_checkpoint' }
export enum EvidenceType { Note='note', ExternalLink='external_link' }
export enum SupervisorRole { Primary='primary', CoSupervisor='co_supervisor', Other='other' }
export enum MeetingType { InPerson='in_person', Online='online', Hybrid='hybrid' }
export enum MeetingStatus { Scheduled='scheduled', Completed='completed', Cancelled='cancelled' }
export enum MeetingActionPhase { PreMeeting='pre_meeting', PostMeeting='post_meeting' }
export enum MeetingActionStatus { Pending='pending', InProgress='in_progress', Completed='completed' }
export enum GoalStatus { Active='active', Completed='completed', Archived='archived' }
export enum GoalType { Weekly='weekly', Monthly='monthly', Research='research' }
export enum TaskStatus { Pending='pending', Completed='completed' }
export enum FocusMode { Countdown='countdown', Stopwatch='stopwatch' }
export enum FocusCompletion { TargetReached='target-reached', StoppedEarly='stopped-early' }
export const SKILL_LEVEL_LABELS:Record<SkillLevel,string>={[SkillLevel.NotStarted]:'Not started',[SkillLevel.Beginner]:'Beginner',[SkillLevel.Developing]:'Developing',[SkillLevel.Proficient]:'Proficient',[SkillLevel.Advanced]:'Advanced'};
export const SKILL_LEVEL_VALUES=[SkillLevel.NotStarted,SkillLevel.Beginner,SkillLevel.Developing,SkillLevel.Proficient,SkillLevel.Advanced] as const;
export const TARGET_LEVELS=[SkillLevel.Beginner,SkillLevel.Developing,SkillLevel.Proficient,SkillLevel.Advanced] as const;
export type TargetSkillLevel=typeof TARGET_LEVELS[number];
export enum RoadmapStatus { Current='current', Locked='locked', Completed='completed' }

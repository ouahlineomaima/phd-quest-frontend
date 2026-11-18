import {SkillLevel,SkillSourceType,EvidenceType,TargetSkillLevel,SKILL_LEVEL_LABELS} from '../../shared/models/domain.enums';
export const PROFICIENCIES=SKILL_LEVEL_LABELS;
export const SOURCE_LABELS:Record<SkillSourceType,string>={[SkillSourceType.WeeklyTask]:'Weekly tasks',[SkillSourceType.ResearchGoal]:'Research goals',[SkillSourceType.RoadmapCheckpoint]:'Roadmap checkpoints'};
export const SKILL_ICONS=['book','target','sparkles','roadmap','clock','trophy'] as const;
export const SKILL_COLORS=['purple','cyan','gold','green'] as const;
export type SkillIcon=typeof SKILL_ICONS[number];export type SkillColor=typeof SKILL_COLORS[number];
export interface SkillCategory{editVersion:string;id:string;name:string;description:string;icon:SkillIcon;color:SkillColor;sortOrder:number;archivedAt:string|null;}
export interface AssociationInput{sourceType:SkillSourceType;sourceId:string;targetLevel:TargetSkillLevel|null;checkpointIdentity?:string;}
export interface Association extends AssociationInput{title:string;missing:boolean;completed:boolean;resolution:'resolved'|'missing'|'unverified';}
export interface SkillProgress{total:number;available:number;completed:number;missing:number;percentage:number|null;ready:boolean;state:'empty'|'unverified'|'complete'|'in_progress';}
export interface TargetedProgress extends SkillProgress{targetLevel:TargetSkillLevel;suggestReview:boolean;}
export interface UntargetedProgress extends SkillProgress{sourceType:SkillSourceType;}
export interface SkillEvidence{id:string;title:string;type:EvidenceType;description:string;url:string|null;createdAt:string;updatedAt:string;}
export interface ProficiencyChange{id:string;fromLevel:SkillLevel;toLevel:SkillLevel;changedAt:string;justification:string;}
export interface ResearchSkill{editVersion:string;id:string;categoryId:string;name:string;description:string;proficiency:SkillLevel;prerequisiteIds:string[];associations:Association[];evidence:SkillEvidence[];proficiencyHistory:ProficiencyChange[];sortOrder:number;archivedAt:string|null;effectiveArchived:boolean;categoryName:string;targeted:TargetedProgress[];untargeted:UntargetedProgress[];prerequisites:{id:string;name:string;proficiency:SkillLevel|null;archivedAt:string|null;missing:boolean;developed:boolean}[];}
export interface SkillTree{initialized:boolean;categories:SkillCategory[];skills:ResearchSkill[];}
export interface SkillsSummary{initialized:boolean;totalActive:number;inDevelopment:number;advanced:number;recentlyImproved:{id:string;name:string;proficiency:SkillLevel;at:string}[];}

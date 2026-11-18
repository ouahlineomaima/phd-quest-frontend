export const PROFICIENCIES=['Not started','Beginner','Developing','Proficient','Advanced'];
export const SOURCE_LABELS:Record<string,string>={weekly_task:'Weekly tasks',research_goal:'Research goals',roadmap_checkpoint:'Roadmap checkpoints'};
export interface SkillCategory{id:string;name:string;description:string;icon:string;color:string;sortOrder:number;archivedAt:string|null;}
export interface Association{sourceType:'weekly_task'|'research_goal'|'roadmap_checkpoint';sourceId:string;targetLevel:number|null;title?:string;missing?:boolean;completed?:boolean;}
export interface SkillProgress{targetLevel?:number;sourceType?:string;total:number;available:number;completed:number;missing:number;percentage:number|null;ready:boolean;state:string;}
export interface SkillEvidence{id:string;title:string;type:'note'|'external_link';description:string;url?:string|null;createdAt:string;updatedAt:string;}
export interface ResearchSkill{id:string;categoryId:string;name:string;description:string;proficiency:number;prerequisiteIds:string[];associations:Association[];evidence:SkillEvidence[];proficiencyHistory:{id:string;fromLevel:number;toLevel:number;at?:string;timestamp?:string;changedAt?:string;justification:string}[];sortOrder:number;archivedAt:string|null;targeted:SkillProgress[];untargeted:SkillProgress[];prerequisites:{id:string;name:string;proficiency:number;archivedAt:string|null;missing:boolean;developed:boolean}[];}
export interface SkillTree{initialized:boolean;categories:SkillCategory[];skills:ResearchSkill[];}
export interface SkillsSummary{totalActive:number;inDevelopment:number;advanced:number;recentlyImproved:{id:string;name:string;proficiency:number;at:string}[];}

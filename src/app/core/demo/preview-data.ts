import { MetricPreview, RoadmapLevel, TaskPreview } from '../../shared/models/preview.models';

// Visual fixtures only. Never persisted, submitted to the API or used as research records.
export const PREVIEW_METRICS: readonly MetricPreview[] = [
  { label: 'Research level', value: '04', note: '680 / 1,000 XP · sample progress', icon: 'sparkles', tone: 'primary' },
  { label: 'Daily streak', value: '7 days', note: 'A little consistency goes a long way', icon: 'flame', tone: 'gold' },
  { label: 'Weekly progress', value: '62%', note: '5 of 8 sample tasks complete', icon: 'target', tone: 'success' },
  { label: 'Weekly workload', value: '16 / 24 h', note: 'Sample focus time, not tracked time', icon: 'clock', tone: 'accent' },
];
export const PREVIEW_TASKS: readonly TaskPreview[] = [
  { title: 'Map the gaps in your literature review', project: 'Literature review', duration: '90 min', category: 'Deep work', tone: 'primary' },
  { title: 'Refine your research questions', project: 'Research design', duration: '60 min', category: 'Writing', tone: 'accent' },
  { title: 'Prepare notes for the supervisor meeting', project: 'Supervision', duration: '30 min', category: 'Planning', tone: 'gold' },
];
export const PREVIEW_DAYS = [
  { name: 'Sunday', short: 'Sun', date: '15', tasks: [] as readonly TaskPreview[] },
  { name: 'Monday', short: 'Mon', date: '16', tasks: PREVIEW_TASKS },
  { name: 'Tuesday', short: 'Tue', date: '17', tasks: [PREVIEW_TASKS[0]] },
  { name: 'Wednesday', short: 'Wed', date: '18', tasks: [PREVIEW_TASKS[1], PREVIEW_TASKS[2]] },
  { name: 'Thursday', short: 'Thu', date: '19', tasks: [PREVIEW_TASKS[0]] },
  { name: 'Friday', short: 'Fri', date: '20', tasks: [PREVIEW_TASKS[2]] },
  { name: 'Saturday', short: 'Sat', date: '21', tasks: [] as readonly TaskPreview[] },
] as const;
export const PREVIEW_OBJECTIVES = ['Build a clearer literature map', 'Narrow the research questions', 'Make the next meeting count'];
export const PREVIEW_DELIVERABLES = [{ title: 'Literature review outline', type: 'Document · sample' }, { title: 'Supervisor meeting notes', type: 'Notes · sample' }];
export const PREVIEW_FOCUS = [28, 76, 52, 90, 64, 38, 15];
export const PREVIEW_GOALS = [
  { title: 'A stronger literature foundation', detail: 'Build a focused reading list and connect the key ideas.', category: 'Research', percent: 65, tone: 'primary' as const, icon: 'book' },
  { title: 'Find your writing rhythm', detail: 'Make consistent space for thoughtful academic writing.', category: 'Personal growth', percent: 40, tone: 'accent' as const, icon: 'target' },
];
export const PREVIEW_LEVELS: readonly RoadmapLevel[] = [
  { number: 1, title: 'Find your direction', detail: 'Research orientation', state: 'completed' },
  { number: 2, title: 'Explore the literature', detail: 'Literature foundations', state: 'completed' },
  { number: 3, title: 'Ask better questions', detail: 'Research questions', state: 'completed' },
  { number: 4, title: 'Shape the approach', detail: 'Research design', state: 'current' },
  { number: 5, title: 'Test the waters', detail: 'Pilot study', state: 'locked' },
  { number: 6, title: 'Gather the evidence', detail: 'Data collection', state: 'locked' },
  { number: 7, title: 'Make sense of it', detail: 'Analysis', state: 'locked' },
  { number: 8, title: 'Connect the findings', detail: 'Interpretation', state: 'locked' },
  { number: 9, title: 'Tell the story', detail: 'Thesis writing', state: 'locked' },
  { number: 10, title: 'Refine the argument', detail: 'Revision', state: 'locked' },
  { number: 11, title: 'Share your contribution', detail: 'Submission', state: 'locked' },
  { number: 12, title: 'Defend your discovery', detail: 'Defense', state: 'locked' },
];
export const PREVIEW_ACHIEVEMENTS = [
  { title: 'The first step', detail: 'Every research journey begins somewhere.', icon: 'sparkles', xp: 50, unlocked: true },
  { title: 'Finding a rhythm', detail: 'A little focus, a little more often.', icon: 'flame', xp: 100, unlocked: true },
  { title: 'Literature explorer', detail: 'Follow the ideas that lead to new questions.', icon: 'book', xp: 150, unlocked: false },
  { title: 'Words into ideas', detail: 'Turn a blank page into a clearer thought.', icon: 'target', xp: 150, unlocked: false },
  { title: 'A meaningful milestone', detail: 'See the bigger picture come together.', icon: 'roadmap', xp: 250, unlocked: false },
  { title: 'The long view', detail: 'Stay curious through the whole journey.', icon: 'trophy', xp: 500, unlocked: false },
];

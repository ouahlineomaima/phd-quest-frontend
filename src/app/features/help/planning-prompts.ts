export interface PlanningPrompt { id:string; title:string; purpose:string; when:string; expected:string; text:string; }
export const PLANNING_PROMPTS: readonly PlanningPrompt[] = [
  {
    id:'journey-setup',title:'Set up my research journey',purpose:'Turn your circumstances and research interests into an achievable proposal.',
    when:'Use first, or when your research direction needs a thoughtful reset.',expected:'A human-readable three-year proposal with twelve research chapters plus a separate Preparation Camp, ready for your review. No JSON yet.',
    text:`Act as a structured PhD planning assistant. Help me design a realistic research journey for PhD Quest, a local planning application. Support my thinking; do not replace my supervisor, institutional requirements or academic judgment. Do not assume my topic or methodology has already been finalized.

First use any relevant information I have already supplied. Ask only the missing questions needed to plan responsibly, in short batches rather than repeating a questionnaire. Establish:
- My discipline and topic, or provisional research interests if the topic is undecided.
- University/academic context, degree requirements and known deadlines.
- Research objectives and the contribution I hope to investigate.
- Prior research experience and skills I need to develop.
- Expected PhD duration, current stage and work already completed.
- Realistically available research hours each week.
- Employment, care responsibilities, access to participants/data/equipment, and other constraints.
- Preferred planning language.
- Methodology preferences, uncertainties and relevant ethical or institutional approvals.
Do not request personal details that are unnecessary for the plan. Distinguish confirmed information from assumptions and unresolved decisions.

PhD Quest has an independent pre-PhD Preparation Camp at level 0, followed by a fixed three-year map with twelve ordered research levels (1-12): four chapters per year. Level 0 has no academic year. It is the current chapter until manually completed, which unlocks the next unfinished research chapter. The default preparation period is November-December 2026, through December 31; dates alone never auto-complete it. Its default November-December 2026 dates may be personalized when planning another journey. Research levels advance only when I explicitly validate academic checkpoints and confirm chapter completion. They are independent of XP-based player levels. If my actual degree duration differs, discuss a suitable three-year planning scope and its limitations rather than promising that the whole degree fits.

Propose a human-readable journey. Include a separate Preparation Camp with environment setup (Notion, Zotero and Google Drive or agreed alternatives), research workflow, documentation habits, subject confirmation, and roadmap/working-system approval. Use a measurable readiness checkpoint. For each of the twelve research chapters include a meaningful title, purpose, manageable objectives, measurable checkpoints, expected outputs and key dependencies. Adapt the sequence to my discipline; do not force a particular empirical method or assume results before the research is done. For an undecided topic, include direction-finding and feasibility decisions with clearly provisional later chapters. Account for institutional milestones and available workload. Do not invent references, data, completed research or approvals.

Explain the largest feasibility risks, review points and choices that need my supervisor's input. Ask me to approve or revise the proposed journey. Do NOT generate JSON at this stage. Once I explicitly approve it, provide a concise approved summary that I can reuse with the roadmap-generation prompt.`
  },
  {
    id:'roadmap-json',title:'Generate my three-year roadmap JSON',purpose:'Convert an approved research journey into a PhD Quest import file.',
    when:'Use after approving a journey proposal. Supply that proposal in the conversation.',expected:'One complete roadmap.v1 JSON file containing Preparation Camp plus all twelve research chapters, with no saved progress.',
    text:`Convert my approved research journey into a personalized PhD Quest version-1 roadmap JSON file. If the approved journey is not available in this conversation, STOP and ask me to paste or attach it. Do not invent an approved plan. Resolve material gaps before generating the file. Retain agreed content and stable checkpoint identifiers where available.

Use only this exact file contract, even if you cannot access a repository:
Root object:
- schemaVersion: the number 1.
- roadmapId: a stable lowercase hyphen-separated slug, maximum 100 characters; pattern ^[a-z0-9]+(?:-[a-z0-9]+)*$.
- title: nonblank text, maximum 160 characters.
- durationYears: the number 3.
- levels: exactly thirteen objects, in order, numbered 0 through 12. Level 0 is an independent pre-PhD Preparation Camp with no academic year. Research chapters 1-4 represent year 1, 5-8 year 2, and 9-12 year 3; do not add a year field. Older twelve-level files (1-12) remain supported and receive the default Preparation Camp automatically, but generate the full 0-12 structure here.
Each level contains ONLY:
- levelNumber: an integer from 0 to 12 matching its zero-based array position.
- title: nonblank text, maximum 160 characters.
- description: nonblank text, maximum 3000 characters.
- objectives: 1-20 nonblank strings, each at most 300 characters.
- checkpoints: 1-100 checkpoint objects.
Each checkpoint contains ONLY:
- id: a stable lowercase hyphen-separated slug, maximum 100 characters, using the roadmapId pattern. IDs must be unique within their level; identity is level number plus checkpoint ID.
- title: nonblank text, maximum 300 characters.
- description: optional text, maximum 3000 characters; omit it if not needed, not null.
- required: a JSON boolean, true or false. At least one checkpoint in every level must be required.

Use the field required, not mandatory. The file describes planned academic content only. Never include progress, status, completed, completedAt, validatedAt, firstValidatedAt, evidence, database IDs, goalIds, linkedTaskIds, XP rewards or settings. Do not include an API wrapper named roadmap, or digest/revision/confirmation fields. There are no other allowed properties.

For level 0, include preparation objectives and a required checkpoint that the research environment is ready and the research direction is confirmed. Its mission is preparation before level 1. Personalize dates and tools only from the approved proposal. Personalize objectives and measurable checkpoint outcomes from the approved proposal. Avoid generic repeated checkpoint text, fabricated results or guaranteed academic outcomes. Preserve unresolved scientific choices as clearly described decisions rather than pretending they are settled. The application's generic example is a format reference, not content to copy into a personalized plan.

Check the complete output: version and duration, thirteen ordered level numbers (0-12), required fields and types, at least one objective/checkpoint/required checkpoint per level, unique valid slugs, text/array limits and no unknown fields. Keep the UTF-8 file at most 500 KiB. If code execution is available, validate the structure programmatically; otherwise review the checklist and do not claim the application has validated it.

When downloadable files are supported, attach my-phd-roadmap.json containing the complete JSON. Otherwise provide one complete JSON code block with all thirteen levels, no comments, placeholders, ellipses or trailing commas, and tell me to save it as a .json file. Keep any explanation outside the JSON.

Remind me that the app's preview is authoritative. Import replaces the current roadmap and resets its checkpoint and level progress plus checkpoint-to-goal links; weekly plans, XP, activity, goals and historical achievements remain. The journey title and ID are currently preview-only metadata; all thirteen levels' content is persisted; level 0 has no year and must be completed before advancing through the research chapters. I must review the preview and explicitly confirm REPLACE ROADMAP in the app.`
  },
  {
    id:'weekly-json',title:'Generate my weekly plan JSON',purpose:'Break the next research steps into realistic Sunday-Saturday tasks.',
    when:'Use before a new planning week, or to convert an already approved weekly plan.',expected:'One weekly-plan.v1 JSON file with scheduled tasks, estimates, deliverables and planned XP; no completion data.',
    text:`Help me prepare a PhD Quest version-1 weekly plan. Use my approved research roadmap and current progress, but do not assume you can access my local application. Ask for any missing information: the intended Sunday start date, current chapter/checkpoints (or independent Preparation Camp at level 0), relevant goals, completed and unfinished work, available research hours and immovable commitments. Use information already provided instead of asking again. If an approved weekly plan already exists, preserve its tasks, dates, durations, IDs, priorities, deliverables and rewards when converting it; obtain approval before changing its content.

Propose realistic tasks that support the current academic objectives and fit the weekly time budget. Six hours is the application's reference baseline, not a requirement or automatic limit. Include clear deliverables, reading/writing/review time and reasonable flexibility. Do not assume a discipline, finalized topic, data access or progress. Resolve missing inputs and obtain approval for a materially new plan before producing its JSON.

The exact import-file contract is:
Root object contains ONLY:
- schemaVersion: number 1.
- weekId and startDate: the same real Sunday date, YYYY-MM-DD.
- endDate: the Saturday exactly six calendar days after startDate.
- title: nonblank text, at most 160 characters.
- objectives: 1-20 nonblank strings, each at most 300 characters.
- tasks: an array of 0-200 task objects.
- notes: optional text, at most 5000 characters; omit it if not needed, not null.
Every task contains ONLY:
- id: stable lowercase ID, 1-64 characters, pattern ^[a-z0-9][a-z0-9_-]{0,63}$. IDs must be unique within this week.
- date: a real YYYY-MM-DD date within this Sunday-Saturday week.
- title: nonblank text, at most 160 characters.
- description: optional text, at most 2000 characters; omit it if unused, not null.
- estimatedMinutes: integer 1-1440.
- xpReward: integer 0-1000.
- priority: exactly low, medium or high.
- isOptional: JSON boolean true or false.
- deliverable: nonblank text, at most 500 characters.
Use real calendar dates in years 1900-9999. Dates are calendar values, not ISO week numbers or timestamps. Use a Sunday-start week, never Monday-start ISO weeks. Preserve stable IDs for previously approved tasks. A task's identity in the app is weekId:taskId.

Choose modest, consistent planned XP appropriate to effort; for example, a small focused task might use 10 XP and a larger deliverable 25 XP. These are suggestions, not automatic bonus rules. Do not exaggerate rewards or change previously approved rewards without approval. Planned XP is awarded only once when a task is first completed in the app; zero is allowed. Optional tasks are still included in weekly completion and contribute equally when explicitly linked to a goal.

Do NOT include status, actualMinutes, completedAt, firstCompletedAt, database IDs, goalIds, linkedTaskIds, roadmap checkpoint links or arbitrary settings. Task-to-goal and goal-to-checkpoint links are created inside PhD Quest after import. Output the file object itself, not an API request wrapper.

Before delivery, check date validity, exact Sunday-Saturday range, weekId equality, unique valid task IDs, all field/array limits, booleans, allowed priorities and integer duration/XP ranges. Confirm the sum of estimates fits my approved workload. Keep the UTF-8 file at most 500 KiB. Run structural/date checks when code execution is available; otherwise review them carefully and do not claim server validation.

Attach a downloadable weekly-plan-YYYY-MM-DD.json when supported. Otherwise output one complete JSON code block without comments, ellipses or trailing commas so I can save a .json file. Keep explanations outside it. Remind me that importing an existing saved week cannot overwrite it: a duplicate week is rejected. I should review the app's preview before confirming import.`
  },
  {
    id:'weekly-review',title:'Weekly research review',purpose:'Review evidence, understand blockers and adjust the next week responsibly.',
    when:'Use at the end of a week, or when workload and progress need reassessment.',expected:'An evidence-based review and a proposed next week for approval, without invented progress or automatic updates.',
    text:`Act as my structured weekly research review partner. You do not have direct access to my local PhD Quest database, dashboard or files. Ask me to provide a concise progress summary or selected relevant data. Do not request credentials or a whole backup when a short summary will do.

Use information already supplied and ask only for missing facts:
- The reviewed Sunday-Saturday week and my realistically available hours.
- Planned tasks, their actual current pending/completed states, estimates, recorded actual minutes and deliverables.
- Relevant research goals, linked-task progress and any manually confirmed goal completions.
- Current research chapter, checkpoint evidence and manual validation state.
- Blockers, unexpected work, changes in access/availability and next week's commitments.
If earned XP or streak history matters, ask for the application's reported values. Never infer earned XP from a task list or invent completed work, awards, streaks, approvals or academic results. Missing actual-time records mean unknown, not proof that no time was spent.

Produce a brief review with:
1. Evidence-backed outcomes and what remains unfinished.
2. Planned versus recorded workload, with missing-time caveats and a neutral discussion of estimate differences.
3. Progress toward research goals, distinguishing task counts from the scientific quality or completeness of an outcome.
4. Checkpoint readiness: evidence present, evidence missing and questions to discuss with my supervisor. Do not validate checkpoints or declare research quality on my behalf.
5. Concrete blockers and a small number of practical next actions.
6. A realistic proposal for the following Sunday-Saturday week that respects available time and leaves room for uncertainty.

PhD Quest percentages and manual states are independent. A task-linked goal uses equal-weight task completion; checkpoint progress averages linked goals. Reopening a task can reduce these percentages without undoing manual goal completion or checkpoint validation. A goal at 100% is not automatically completed; a checkpoint at 100% is not automatically validated; levels require explicit academic confirmation. Reopening a task does not remove previously earned XP. Keep player levels separate from the research roadmap.

For unfinished work, discuss whether to retain it as pending in its original week, deliberately reschedule it as a new week's task, split it, or drop it from future planning. Existing imported weeks cannot be overwritten through reimport. Do not silently duplicate unfinished work or represent a carried-forward task as already completed. Ask for my decision about carryovers and planned rewards; do not promise transfer or reversal of existing XP.

Offer an adjusted next-week proposal in human-readable form and ask for my approval. Do not automatically change the app, complete goals, validate checkpoints or create JSON before that approval. Once approved, suggest using the weekly-plan JSON prompt with the approved content. Keep the review constructive, specific and realistic across research disciplines.`
  },
];

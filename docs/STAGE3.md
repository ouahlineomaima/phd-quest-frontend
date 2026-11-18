# Stage 3 maintainability

Scoped rollout: quality-scope.json lists the adopted files. Untouched files remain a documented baseline; no global formatting or rule suppression is applied. New files in these refactoring surfaces must be added to this manifest.

Use npm run lint and npm run format:check for checks; they never modify files. npm run format deliberately formats only the adopted scope. Prettier uses two-space indentation, single quotes, trailing commas and LF endings; Angular templates use the Angular parser. TypeScript ESLint checks typed code, unused imports/variables, explicit any and unnecessary assertions. Angular templates also receive supported accessibility rules.

## Ownership and recovery

Skills and SupervisorMeetings own navigation, filtering and selection. Page-provided feature facades own primary server data and refreshes. SkillDetail/MeetingDetail render inputs and emit commands. SkillEditors/MeetingEditors own drafts, captured edit versions and dialog lifecycles. Shared page-local EditorFeedback owns pending commands, notifications and explicit stale-draft inspection/discard; it never retries a stale command. ResearchReferences and ReferenceOptions own independently cancellable goal/roadmap options. Optional failures retain links and expose retry controls. Options refresh when an editor needs them; ordinary saves refresh primary records rather than all reference datasets.

Historical checkpoint identities are preserved. A meeting's unverified/replaced checkpoint remains a historical row; remove and save before explicitly linking its current replacement. Unavailable optional pickers cannot silently replace existing links.

## Time and accessibility

MeetingClock updates a reactive instant at the next scheduled boundary or after at most 60 seconds, and resynchronizes on focus/visibility changes. Cleanup removes timers and listeners. Partitioning uses persisted absolute timestamps, retains equality in Upcoming, and reverses History in the existing server order. Local scheduling/timezone conversion remains on the existing API path.

Skill nodes remain native buttons with aria-pressed and aria-controls. Selection focuses a labelled detail section; its return control focuses the selected node (or search if filtered out). Dialog saves return to their opener, with a stable detail fallback. Both themes use a visible 3px focus ring. No incomplete ARIA tree model or routine live-region announcements were added.

`node --test test/focus-engine.test.cjs test/domain-contract.test.cjs test/stage3/*.test.cjs` covers domain contracts, clock boundaries/DST, cancellation, independent resource failures and preserved conflict drafts. Backend-owned browser checks exercise the built application against verified disposable data. Browser semantic/keyboard checks do not replace manual screen-reader testing; an actual screen reader was not available.

## Verified result

Production build, scoped lint/format checks, and all 16 frontend automated tests pass. The built application passed 14 Stage 3 browser checks plus 14 existing Stage 1/2 browser checks in Edge, covering stale drafts, legacy links, editor saves, independent reference failures/retry, real time-boundary movement and dark/light desktop/mobile layouts. Dialog focus waits until refresh completes. Imperative editor opening marks its OnPush view so explicit discard/reload displays the fresh server fields.

npm run test:stage3 runs the focused state/clock tests. The adoption manifest also applies Angular template rules to virtual inline templates produced by the Angular ESLint processor. Generated lockfiles remain npm-managed. No application dependency versions changed. Manual screen-reader testing remains outstanding; Stage 4 and Feature 4 were not started.

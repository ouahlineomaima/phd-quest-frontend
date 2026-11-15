# Phase 4 - weekly plans and JSON import

Weekly Plan now uses real saved records. Dashboard, Roadmap, Goals and Achievements remain previews. No completion, XP award, streak, goal, roadmap or dashboard business rules were added.

## Import a plan

Open /weekly-plan and click **Import Weekly Plan**. Select a .json file up to 500 KiB. The file is parsed locally and submitted to the backend preview endpoint. Review the normalized title, Sunday-Saturday dates, objectives, daily tasks, estimated minutes and potential XP, then choose Confirm import. Nothing is saved by preview. Confirmation is disabled while pending, guarded against double invocation, and revalidated on the server.

The native dialog provides focus containment, Escape handling and focus restoration. It stays open during confirmation to avoid discarding a pending save. Invalid JSON, oversized files, field/date errors, duplicate task IDs, backend unavailability and existing-week conflicts have visible messages. A failed request must be validated again before confirmation. Conflicts appearing after a preview become blocked previews; closing the dialog refreshes the saved-week list.

The canonical contract, complete import example, API response examples and reusable ChatGPT prompt are in the sibling backend's [weekly-plan guide](../../phd-quest-backend/docs/WEEKLY_PLANS.md). Use schemaVersion=1 and the Sunday start date as weekId, not an ISO week number. Do not import database IDs, timestamps or progress fields. Existing weeks cannot be overwritten or merged.

## Browse saved weeks

Select a saved week from the newest-first selector. Sunday-Saturday buttons choose the daily view. Task cards show description, estimated duration, potential XP metadata, priority, optional/mandatory flag, deliverable, stable ID and current status. Completion is disabled until Phase 5. Objectives, daily deliverables, optional notes and weekly estimated workload come from the API. Six hours is a planning reference only; it is not a quota or limit.

WeeklyPlansApi is a focused HttpClient service with typed interfaces and request timeouts. Signals manage list/detail loading, selection, errors, import preview and confirmation. Previous detail requests are cancelled when selecting another week. No plan data is stored in localStorage; refreshing the page loads MongoDB-backed data. All imported text uses Angular text interpolation, never HTML rendering. The weekly page no longer imports preview fixtures; other pages retain their isolated demo data.

## Validation

Production build passed (initial bundle 259.69 kB). A short Chrome smoke check covered invalid JSON, unsupported version, missing title, duplicate IDs, invalid dates/duration, progress injection, backend outage/retry, preview without writes, pending-confirmation guard, saved records after reload, daily empty states, duplicate-week conflicts, a conflict introduced by another client after preview, and 375px layout. Native dialog focus/Escape/return were verified. There were no unexpected JavaScript runtime or console errors; expected 400/409/503 responses were intentionally exercised.

The mobile check found and fixed implicit grid sizing caused by a long saved-week title/native selector. The completed smoke pass succeeded after that fix. Desktop import and mobile saved-plan screenshots were visually inspected. Local screenshots are ignored QA artifacts: .artifacts/phase4-import-preview.png, phase4-week-mobile.png and phase4-conflict-mobile.png.

All smoke records used UUID-marked temporary weeks in 2099, separate from real research weeks. Cleanup matched their own IDs and UUID titles; it did not remove user plans. Database persistence was verified through direct MongoDB readback and browser reload. No infrastructure configuration changed, so the full infrastructure shutdown/persistence script was intentionally not rerun.

See the sibling backend's [complete validation report](../../phd-quest-backend/infra/validation/PHASE4.md) for API safety checks and limits. Run `npm run build` in this repository for the production check. No runtime dependencies or versions changed. Pushes remain optional and were skipped; Phase 5 was not started.

# PhD Quest frontend

Angular 22 standalone/signals frontend for a local PhD research workspace. Supported runtime: Node.js 24.15+ within 24.x, declared in package engines and `.nvmrc`. The [NestJS/MongoDB backend](https://github.com/ouahlineomaima/phd-quest-backend) supplies authoritative records and business rules. No authentication, multi-user mode or AI API is included.

## Features and navigation

| Route                                              | Purpose                                                                                                   |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `/dashboard`                                       | Current week, research and achievement summaries                                                          |
| `/weekly-plan`                                     | Sunday-start weekly JSON import, tasks, completion/reopening and time                                     |
| `/focus`                                           | Shared server timer, heartbeat recovery, saved sessions, corrections and explicit task-time application   |
| `/supervisor-meetings`, `/supervisor-meetings/:id` | Profiles, meeting notes, actions, history and linked activity                                             |
| `/skills`                                          | Categories, prerequisites, evidence, manual proficiency/history and readiness                             |
| `/roadmap`                                         | Independent Level 0 Preparation Camp plus twelve chapters, imports, editable titles and manual validation |
| `/goals`                                           | Cross-week task links, derived progress, manual completion/reopening and archive                          |
| `/achievements`                                    | Persisted awards and explicit eligibility reconciliation                                                  |
| `/settings`                                        | Appearance and guarded backup export/preview/restore                                                      |
| `/help`                                            | Onboarding, workflow guide, planning prompts and JSON examples                                            |

The root redirects to Dashboard; unknown routes show a styled 404. Shell/pages are lazy-loaded. Task/goal/checkpoint progress does not automatically confirm goals, checkpoints, skill proficiency or meeting-action status, and Focus does not automatically complete tasks or award XP.

Weekly tasks and Focus share one backend-persisted timer. The shell mini timer follows navigation and tabs; close/connection recovery excludes unconfirmed time. Stopped sessions retain measured duration and allow a corrected whole-minute duration before explicit task application. Start/Resume grants a five-minute work window, renewed by app interaction. Historical Focus applications remain separate; new confirmed applications add to task actual minutes. See the backend [Focus guide](https://github.com/ouahlineomaima/phd-quest-backend/blob/main/docs/FOCUS.md) for the recovery policy and compatibility details.

## Start

Keep both repositories as siblings. From their parent workspace with Docker Desktop's Linux engine running:

```powershell
docker volume create phd-quest_mongo_data
docker compose -f phd-quest-backend/infra/docker-compose.yml up -d --build --wait
```

The existing external MongoDB volume is retained. Never delete/recreate it for development or tests. Ordinary `docker compose -f phd-quest-backend/infra/docker-compose.yml down` stops services without deleting its research data. Open http://localhost:4200; API health is http://localhost:3000/api/health.

For host development with Node 24 and the backend already running:

```powershell
npm ci
npm run build
```

`npm start` uses the Compose-oriented `proxy.conf.json`, whose `/api` target is `http://backend:3000` with `changeOrigin: true`. For host-only Angular development, provide a separate ignored proxy file pointing to `http://localhost:3000`, then run `npx ng serve --proxy-config <that-file>`. Keep the browser Origin intact and configure its exact origin in backend `CORS_ORIGINS`. The production build is `dist/phd-quest/browser`; static hosting requires index.html fallback and a separately configured `/api` route. Deployment is not part of this project stage.

## Angular organization

`core/` owns layout, navigation, theme and typed API clients. `shared/` contains domain enums, presentation components, reference-loading state and conflict feedback. Feature folders contain `.ts`, `.html` and `.scss` files.

Skills/Meetings pages own navigation/filter/selection state; page-scoped facades own authoritative server records. Detail components present inputs and emit commands. Editor components own local drafts and captured edit versions; shared feedback preserves stale drafts for explicit inspection/discard. Imperatively opened editors mark their OnPush view, and focus returns only after refresh finishes. Optional goal/roadmap/supervisor reads recover independently and expose retry controls. Meeting Upcoming/History uses a reactive boundary clock with cleanup, not a non-reactive Date.now computed value.

The backend protects existing records with quoted `If-Match` versions. Missing/stale versions return 428/409; the UI retains drafts and never silently retries with a new token. Refresh open editors after restore. Checkpoint associations combine public IDs with immutable identities; legacy identity-less links remain unverified until explicitly removed/saved/relinked. Manual proficiency/history and manual actions remain independent.

## Themes and accessibility

Semantic CSS variables support dark/light themes; preference is restored early and shared through ThemeService/localStorage. Fonts are self-hosted with their licenses. Desktop navigation collapses; mobile navigation has Escape/focus handling, an inert closed state and reduced-motion support. Skill nodes remain native buttons exposing selection and their labelled detail relationship; keyboard selection/return and both themes have visible focus rings. No incomplete ARIA tree interaction is advertised.

Browser automation verifies semantics, keyboard interaction and responsive layouts. Actual screen-reader testing remains outstanding; automated checks do not substitute for assistive-technology testing.

## Data and backups

Authoritative state stays on the backend. Dashboard/achievement navigation uses read-only GETs; **Check eligible achievements** is an explicit guarded command. Version-1 backups preserve original records plus optional Focus/Meeting/Skill sections. Settings validates a file, previews counts/version/timezone and requires `REPLACE ALL DATA` before atomic restore. Stale previews must be validated again. Restore replaces research data and rotates editor tokens; export the current workspace first when retaining it matters. Old optional sections initialize empty; unverified historical checkpoint links are preserved. Theme is a device preference. Maximum backup size is 20 MiB.

## Verification and contribution

```powershell
npm test                 # Focus engine, domain contracts, facades, references and clock
npm run verify           # Production build, scoped lint, maintained-file format check, tests
npm run test:stage3       # Focused facade/reference/conflict/clock group
npm run lint
npm run format:check
npm run format           # Deliberate formatting
```

These default checks require no MongoDB and refuse unsupported Node versions. Formatting covers maintained source/templates/styles/tests/config/docs; lint remains staged adoption in `quality-scope.json`. Generated output, dependencies, lockfiles and agent instructions are excluded from formatting.

`npm run test:browser` delegates to the sibling backend's owned disposable workflow, which requires Node 24, its dependencies, a frontend build, an explicit `TEST_MONGODB_URI` and an available Edge/Chrome/Chromium browser. Playwright Core is a local backend dev dependency; no external path or automatic browser download is required. [Frontend verification](docs/VERIFICATION.md) and the backend guide explain full regression commands and safety. Artifacts stay ignored.

The Node 24 GitHub Actions workflow runs `npm ci` and `npm run verify` without production secrets or a database. Browser/integration suites are intentionally separate. Keep commits focused, do not commit research backups/secrets/generated artifacts, and never force-push.

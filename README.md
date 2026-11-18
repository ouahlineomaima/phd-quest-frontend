# PhD Quest frontend

Angular 22 standalone frontend for a local-first PhD research workspace: pre-PhD Level 0 Preparation Camp and personalized twelve-chapter research roadmaps, Sunday-Saturday weekly plans, task progress/time recording, immutable XP and streaks, goals connected to tasks and checkpoints, achievements, a live dashboard and guarded backup/recovery. Dark/light themes and responsive navigation are included.

The frontend requires the [NestJS/MongoDB backend](https://github.com/ouahlineomaima/phd-quest-backend). [Help & Guide](http://localhost:4200/help) contains onboarding, workflow explanations, four complete copyable ChatGPT prompts and validated generic roadmap/weekly-plan downloads. There is no AI API integration or API-key requirement in PhD Quest.

## Start

For a fresh installation, install Git and Docker Desktop with its Linux container engine running (Compose v2). Node.js is not needed for this Docker workflow. From the directory where you want the new workspace:

```powershell
mkdir phd-quest
cd phd-quest
git clone https://github.com/ouahlineomaima/phd-quest-backend.git
git clone https://github.com/ouahlineomaima/phd-quest-frontend.git
docker volume create phd-quest_mongo_data
docker compose -f phd-quest-backend/infra/docker-compose.yml up -d --build --wait
```

The external volume must exist before first startup. The volume-create command leaves an existing volume intact; never delete it to restart or recover the application. From an existing workspace root, restart with `docker compose -f phd-quest-backend/infra/docker-compose.yml up -d --wait`. Ordinary `docker compose -f phd-quest-backend/infra/docker-compose.yml down` stops services without deleting data.

Open http://localhost:4200; the guide is at http://localhost:4200/help. The Compose file in the backend repository starts all three services. Source bind mounts and polling preserve hot reload. Import a personalized JSON roadmap on Roadmap, review its replacement warning, then explicitly confirm. Import a new Sunday-Saturday JSON plan on Weekly plan and review the preview before saving. The guide explains valid contracts and optional connections; no example is imported automatically.

For an independent build with Node 24.15+ (24.x):

```powershell
npm ci
npm run build
npm start
```

The development proxy forwards `/api` to `http://backend:3000` inside Compose. Host-only development needs a separate proxy file targeting localhost:3000, supplied to `npx ng serve --proxy-config <file>`. Static production hosting must serve `dist/phd-quest/browser` with index.html fallback for client routes, and route /api separately; the development proxy is not embedded in the production bundle.

## Structure

```text
public/
  help/examples/                    validated generic JSON downloads
  icon.svg                          full/compact graduation-cap identity and favicon
  fonts/                            self-hosted Inter and Space Grotesk + OFL licenses
src/
  index.html                        early saved-theme initialization
  styles.scss                       semantic colors, typography, buttons and layout helpers
  app/
    app.ts, app.config.ts, app.routes.ts
    core/
      layout/                       branding, responsive shell, styled 404
      navigation/navigation.ts      shared sidebar labels and icons
      services/
        theme.service.ts            dark/light signals and localStorage preference
        health.service.ts           existing /api/health only; no business API
    shared/
      models/preview.models.ts      lightweight presentation interfaces
      components/
        icon/icon.ts                original stroke-based SVG icon set
        ui.ts                       card, page/section headings, stat, badge,
                                    progress bar/ring, empty state, loading indicator
        task-preview.ts             display-only sample task row
    features/
      dashboard/                    metrics, focus list, weekly chart, roadmap, goals
      weekly-plan/                  typed API service/models, real week/day browsing,
                                    task cards and accessible import dialog
      roadmap/                      three-year map, checkpoint validation and explicit completion
      goals/                        goal creation, editing, completion, reopening and archive
      achievements/                 persisted locked/unlocked milestone cards
      settings/                     appearance, calendar information and backup/recovery
      help/                         guide, onboarding and complete planning prompts
      # Page folders use .ts, .html and .scss files.
docs/PHASE3.md                       validation and scope report
.artifacts/                         ignored local QA script/screenshots, not application source
```

Routes are /dashboard, /weekly-plan, /roadmap, /goals, /achievements, /settings and /help. The root redirects to /dashboard; unknown paths show a styled 404. Feature pages and the shell are lazy-loaded.

## Design system

Default semantic palette: background #0B1020, surface #151C31, primary #8B5CF6, accent #22D3EE, XP gold #FBBF24, success #34D399, text #F8FAFC, muted #94A3B8, border #27334D, warning #F97316 and locked #64748B. CSS custom properties are the single source of truth. Dark tinted surfaces use a lighter `--primary-text` for small text, while light mode uses darker foreground variants. Primary button fill and text are separate semantic tokens.

Space Grotesk headings and Inter body fonts are self-hosted with system fallbacks and font-display: swap. Their OFL licenses are in public/fonts; the app makes no runtime font-CDN requests. Small SVG icons use a consistent stroke style, without another runtime package. The cap mark is vector-based and reused for the expanded brand, collapsed sidebar and favicon.

Reusable standalone components are exported from shared/components/ui.ts. Progress inputs are clamped to 0-100 and expose accessible names and values. Status badges use text as well as color. Button/link styles are global .button, .button.primary, .icon-button and .text-link classes; use native disabled attributes for unavailable actions.

The desktop sidebar persists and can collapse. At 760px and below it becomes a drawer with backdrop, Escape handling, focus return and a keyboard focus loop. Closed mobile navigation is inert. Content stacks as space narrows, with fluid grids and visible keyboard focus. The global reduced-motion preference disables decorative animation and transitions. A skip link moves directly to main content.

ThemeService defaults to dark and stores only the theme string in localStorage under phd-quest-theme. The inline initializer in index.html restores the preference before Angular renders to avoid a theme flash. Blocked storage does not prevent in-memory theme switching. Header and settings controls share the same state.

## Data and recovery

Business rules and authoritative progress remain on the backend. Task actions replace confirmed plan/progress and shared gamification state; failures retain the last confirmed state. The dashboard uses Sunday-start weeks in the configured application timezone. No sample research records are displayed or persisted.

In Settings, **Export backup** downloads a complete JSON file. **Restore backup** validates a selected file, previews its date/version/counts, and requires typing `REPLACE ALL DATA`. Replacement is atomic; stale previews must be validated again. After success the shared progress summary refreshes, and **Open restored dashboard** reloads the workspace. Export the current state first if it must be retained. Maximum backup size is 20 MiB; the destination calendar timezone must match. Theme remains a device preference. There is no account system or timezone editor.

## Validation and development workflow

Run a production build after meaningful UI changes. Confirm startup, direct route navigation, the styled fallback, theme persistence, responsive layouts and /api/health proxy behavior. Existing safeguards are retained; comprehensive unit/E2E suites and coverage targets are outside this MVP scope.

A temporary playwright-core installation outside the repository drove the existing Chrome browser for a lightweight smoke pass. No test framework or production dependency was added. Generated screenshots and the local smoke script are in ignored .artifacts/. See docs/PHASE3.md for results, screenshots and limitations.

After each completed semantic unit, review, validate and create a short human-friendly Conventional Commit locally. Push only when authentication is already working; unavailable authentication must not block implementation. Do not force-push or commit secrets, dependency directories, build outputs or QA artifacts. Stop at the requested phase.

### Concurrent edits (Stage 1)

Skill, category, meeting, action/evidence and supervisor editors send the version originally loaded with each update. A stale save keeps the draft and offers **Inspect latest record** or **Discard draft and reload**; it never retries with a newer version automatically. After a restore, reload any open editors before saving. Refresh the frontend when upgrading the backend: older clients without the required If-Match header receive VERSION_REQUIRED.

Browser writes use JSON and must come from an exact backend CORS_ORIGINS entry (normally http://localhost:4200); the Angular development proxy preserves the browser Origin. Stage 1 browser verification lives in the backend test/safety/browser.check.cjs and uses an owned disposable database, not the running application's data.

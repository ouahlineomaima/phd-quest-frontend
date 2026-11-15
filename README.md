# PhD Quest frontend

Angular 22 standalone frontend with a responsive dark-first workspace and local theme preferences. Phase 4 connects Weekly Plan to real backend records, with JSON preview/confirmation and daily browsing. Dashboard, Roadmap, Goals and Achievements remain clearly labeled previews; no task completion or gamification rules are implemented. See the [Phase 4 workflow](docs/PHASE4.md).

## Start

Keep `phd-quest-frontend` and `phd-quest-backend` as sibling repositories. From the parent workspace:

```powershell
cd phd-quest-backend/infra
docker compose up -d --build
# Stop without removing database data:
docker compose down
```

Open http://localhost:4200. The canonical Compose file remains in backend/infra. Source bind mounts and the Angular server's polling preserve hot reload. Phase 4 preserves the Docker setup and database configuration while integrating the weekly-plan API.

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
  icon.svg                          full/compact graduation-cap identity and favicon
  fonts/                            self-hosted Inter and Space Grotesk + OFL licenses
src/
  index.html                        early saved-theme initialization
  styles.scss                       semantic colors, typography, buttons and layout helpers
  app/
    app.ts, app.config.ts, app.routes.ts
    core/
      demo/preview-data.ts          isolated, immutable visual fixtures
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
      roadmap/                      three-year map with twelve illustrative levels
      goals/                        sample goal cards and genuine empty-state messaging
      achievements/                 locked/unlocked sample badges and XP presentation
      settings/                     appearance + future settings sections
      # Page folders use .ts, .html and .scss files.
docs/PHASE3.md                       validation and scope report
.artifacts/                         ignored local QA script/screenshots, not application source
```

Routes are /dashboard, /weekly-plan, /roadmap, /goals, /achievements and /settings. The root redirects to /dashboard; unknown paths show a styled 404. All six features and the shell are lazy-loaded.

## Design system

Default semantic palette: background #0B1020, surface #151C31, primary #8B5CF6, accent #22D3EE, XP gold #FBBF24, success #34D399, text #F8FAFC, muted #94A3B8, border #27334D, warning #F97316 and locked #64748B. CSS custom properties are the single source of truth. Dark tinted surfaces use a lighter `--primary-text` for small text, while light mode uses darker foreground variants. Primary button fill and text are separate semantic tokens.

Space Grotesk headings and Inter body fonts are self-hosted with system fallbacks and font-display: swap. Their OFL licenses are in public/fonts; the app makes no runtime font-CDN requests. Small SVG icons use a consistent stroke style, without another runtime package. The cap mark is vector-based and reused for the expanded brand, collapsed sidebar and favicon.

Reusable standalone components are exported from shared/components/ui.ts. Progress inputs are clamped to 0-100 and expose accessible names and values. Status badges use text as well as color. Button/link styles are global .button, .button.primary, .icon-button and .text-link classes; use native disabled attributes for unavailable actions.

The desktop sidebar persists and can collapse. At 760px and below it becomes a drawer with backdrop, Escape handling, focus return and a keyboard focus loop. Closed mobile navigation is inert. Content stacks as space narrows, with fluid grids and visible keyboard focus. The global reduced-motion preference disables decorative animation and transitions. A skip link moves directly to main content.

ThemeService defaults to dark and stores only the theme string in localStorage under phd-quest-theme. The inline initializer in index.html restores the preference before Angular renders to avoid a theme flash. Blocked storage does not prevent in-memory theme switching. Header and settings controls share the same state.

## Preview boundary

The global banner distinguishes the real Weekly Plan view from preview pages. Mock research data remains isolated in core/demo/preview-data.ts and is never posted to the API or persisted. Weekly Plan does not import those fixtures: it reads saved weeks and imports user-selected JSON only after server validation and explicit confirmation. Task completion, goal creation, roadmap unlocks, workload settings, XP/streak rules, backup and restore remain disabled or absent.

The focused WeeklyPlansApi service reads list/detail and submits preview/confirmation using /api/weekly-plans, with explicit loading/error/empty states and request timeouts. Settings also checks GET /api/health. Theme remains the only locally stored preference. Settings shows browser timezone as read-only reference; there is no account system or stored profile.

For real features, replace the corresponding preview view models with typed API data and explicit loading/empty/error states. Keep business rules and authoritative progress on the backend. No state-management library or generic API layer is added prematurely.

## Validation and development workflow

Run a production build after meaningful UI changes. Confirm startup, direct route navigation, the styled fallback, theme persistence, responsive layouts and /api/health proxy behavior. Existing safeguards are retained; comprehensive unit/E2E suites and coverage targets are deferred for this phase.

A temporary playwright-core installation outside the repository drove the existing Chrome browser for a lightweight smoke pass. No test framework or production dependency was added. Generated screenshots and the local smoke script are in ignored .artifacts/. See docs/PHASE3.md for results, screenshots and limitations.

After each completed semantic unit, review, validate and create a short human-friendly Conventional Commit locally. Push only when authentication is already working; unavailable authentication must not block implementation. Do not force-push or commit secrets, dependency directories, build outputs or QA artifacts. Stop at the requested phase.

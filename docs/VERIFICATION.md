# Frontend verification

Use Node 24.15+ within the 24.x line (`.nvmrc` and package engines). `npm ci`, then `npm test` runs the existing Focus engine, domain-contract, independent-reference/facade, conflict-feedback and meeting-clock tests without MongoDB. `npm run test:stage3` selects the focused state/clock tests. Unsupported runtimes are refused.

`npm run verify` builds once, checks scoped lint, checks formatting of all maintained files, and runs frontend tests. Target groups are `build`, `lint`, `format` (check only), and `unit`; `--no-build` is reserved for known fresh output. `verification.json` lists the current suites. Use `npm run format` only for deliberate formatting. No framework or application dependency major version was upgraded.

For browser/keyboard/accessibility verification, install dependencies in both sibling repositories and build this frontend. In a host shell running Node 24:

```powershell
$env:TEST_MONGODB_URI='mongodb://localhost:27017/phd_quest_test?replicaSet=rs0&directConnection=true'
# Optional: point BROWSER_EXECUTABLE at an installed Edge/Chrome/Chromium executable.
npm run test:browser
```

This delegates to the backend's private API/proxy/database workflow; it does not target the running application's API. The backend owns a pinned Playwright Core dev dependency and portable installed-browser discovery. No external Playwright directory is required. Install a browser separately; binaries never download automatically. Node 24 is required on the host as well as in Docker. A Windows browser executable cannot run inside a Linux container.

The consolidated browser workflow covers all feature routes, Settings backup controls, dark/light desktop/mobile layouts, two-tab draft conflicts, historical unverified checkpoint links, keyboard selection and focus, optional-reference errors and time-reactive meetings. Generated artifacts are ignored. Actual screen-reader testing remains outstanding.
The same workflow now includes the integrated task timer: Weekly Plan and Focus entry, mini timer persistence, keyboard lifecycle controls, duration correction, explicit exactly-once application, multiple tabs, normal close delivery and heartbeat-cutoff recovery. Safe frontend tests also cover shared timer state, monotonic display, lease/activity cutoffs and stale-session feedback. The backend [Focus guide](https://github.com/ouahlineomaima/phd-quest-backend/blob/main/docs/FOCUS.md) documents the activity policy and legacy application compatibility.

From the backend, `npm run verify -- all` runs build/quality/safe tests plus the explicitly opted-in integration, performance and browser groups, requiring the sibling frontend build. See the [backend verification guide](https://github.com/ouahlineomaima/phd-quest-backend/blob/main/docs/VERIFICATION.md) for owned-database safety, Docker commands, CI exclusions and troubleshooting. The default CI workflow provisions no database/browser and runs only safe verification.

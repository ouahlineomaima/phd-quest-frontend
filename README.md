# PhD Quest frontend

Clone this repository beside `phd-quest-backend`. Shared Compose configuration and setup instructions live in [backend infra](https://github.com/ouahlineomaima/phd-quest-backend/tree/main/infra). From the parent workspace run `cd phd-quest-backend/infra` then `docker compose up -d --build`; stop with `docker compose down`. Main branch: https://github.com/ouahlineomaima/phd-quest-frontend.

Phase 1 foundation: standalone Angular, SCSS, routing, HttpClient and zoneless change detection. The empty router outlet intentionally renders a blank page. No design system or business features are installed.

Use Node 24.15+ (24.x) and npm. Run `npm ci`, `npm run build`, or `npm start`. The development server listens on port 4200 and polls for file changes for Windows Docker bind mounts.

`proxy.conf.json` forwards `/api` to `http://backend:3000` inside Compose. For host-only development, use a separate local proxy configuration targeting `http://localhost:3000`, and pass it to `npx ng serve --proxy-config <file>`.

`src/app/core` is reserved for application-wide services, `shared` for reusable presentation code, and `features` for future routed features. Empty directories are tracked with `.gitkeep`.

This repository builds independently with `npm run build`. Its Dockerfile is a development image; run it on the Compose network to resolve the backend proxy hostname.

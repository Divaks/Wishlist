# Development, build and deployment

Follow the [local setup](../README.md#локальний-запуск) to install each package
with npm, start PostgreSQL, configure the API and run Vite. The API package
supports Node.js 22.12+ in the 22 line or Node.js 24. CI uses 24 for the API.
The web package pins Node.js 22 via [`.nvmrc`](../wishlist-web/.nvmrc) and its
[setup guide](../wishlist-web/README.md#prerequisites) specifies 22.22.2 or
newer in that line for tests.

## Environment and Compose

[Compose](../docker-compose.yml) starts PostgreSQL 16 with a named volume and
takes initialization values from the root environment. Start the API and
frontend separately. Preserve credential and database settings for existing
volumes. When the API starts from its own directory, process variables take
precedence over `.env.${NODE_ENV ?? "local"}`, then `.env` and `../.env`.
Use the [root template](../.env.example) and the
[web template](../wishlist-web/.env.example) for local configuration.

Vite proxies `/api` to `http://localhost:3000` and removes the prefix in
development. Frontend overrides belong in `wishlist-web/.env.local`.

## Builds and verification

| App | Build and local execution | CI |
| --- | --- | --- |
| API | `npm run build`, then `npm run start:prod`. Startup applies registered migrations. | Install with `npm ci`, run ESLint, Jest with coverage, build and PostgreSQL E2E. |
| Web | `npm run build` produces `dist/`. Use `npm run preview` for local preview. | Install with `npm ci`, then typecheck, lint, test and build. |

See the [CI workflow](../.github/workflows/ci.yml) for exact commands and
the [README](../README.md#перевірки) for test database and smoke setup. Keep
API and web CI checks independent and use each package’s lockfile and Node
version when changing a job.

A static frontend host needs an SPA fallback to `index.html` for frontend
routes. Keep the `/api` prefix rewrite in a same-origin proxy, or supply an
absolute `VITE_API_URL` at build time and configure the API's CORS origins.
The repository defines CI and local database infrastructure. Production
hosting and release procedures are environment-specific.

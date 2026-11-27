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

Leave `DATABASE_URL` empty to use `DB_HOST`, `DB_PORT`, `DB_USERNAME`,
`DB_PASSWORD` and `DB_NAME`. A non-empty `DATABASE_URL` takes precedence over
all five variables.

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

## Manual cloud deployment

Deploy the same revision of `Divaks/Wishlist` to Render and Cloudflare Pages.
Start with a fresh database. For existing Wishlist data, follow the
[backup and migration procedure](../README.md#міграція-зі-старої-партнерської-схеми)
before starting the API against that data. For Render, select the target
database in `DATABASE_URL`.

### 1. Create the Neon database

Create a Free project with PostgreSQL **16** in a region close to the Render
region you plan to use. In the **Connect** dialog, select the database and its
owner role and turn off connection pooling. The role needs permission to
create or alter the schema objects used by the startup migration.
[Neon project settings](https://neon.com/docs/manage/projects) ·
[Neon connection security](https://neon.com/docs/connect/connect-securely)

Use the direct hostname from Neon, which has no `-pooler` suffix. Change the
supplied `sslmode` value to `verify-full` and keep all other parameters,
including `channel_binding=require` when supplied. Keep credentials
percent-encoded as in the URL copied from Neon.

```text
postgresql://ROLE:URL_ENCODED_PASSWORD@DIRECT_NEON_HOST:5432/DATABASE?sslmode=verify-full&channel_binding=require
```

TypeORM 0.3.31 passes the URL to pg 8.18.0 as its connection string.
pg merges the parsed URL over its pool settings, so URL-derived TLS options
take precedence over a separate `ssl` option. With pg-connection-string 2.14.1,
`verify-full` enables TLS with Node's certificate and hostname verification.
The API also enables pg's SCRAM channel binding option when the URL requests
it. The locked pg client uses channel binding when the server offers it.

### 2. Create the Render API

Create a **Web Service** from the Git repository. Choose the branch containing
these changes and set the following values.
[Render web services](https://render.com/docs/web-services) ·
[Node.js version](https://render.com/docs/node-version) ·
[Health checks](https://render.com/docs/health-checks)

| Setting | Value |
| --- | --- |
| Runtime and instance type | Node, Free |
| Region | Close to the Neon project |
| Root Directory | `couple-wishlist-api` |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm run start:prod` |
| Health Check Path | `/health` |
| `NODE_VERSION` | `24.22.1` |
| `DATABASE_URL` | Direct Neon URL from step 1 |
| `JWT_SECRET` | A unique secret generated with `openssl rand -hex 32` |
| `CORS_ORIGIN` | Exact Pages origin, for example `https://wishlist-web.pages.dev` |

Render supplies `PORT`. The API binds that port on `0.0.0.0` and runs migrations
before serving traffic. Record the assigned Render origin, for example
`https://wishlist-api.onrender.com`. Open that origin's `/health` endpoint
and expect HTTP 200 with a `status` of `ok`. A Free service may take time to
wake after inactivity. [Render Free services](https://render.com/docs/free)

### 3. Create the Cloudflare Pages frontend

Create a **Pages** project using Git integration. Choose the branch containing
these changes as the production branch.
[Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/) ·
[Pages build image](https://developers.cloudflare.com/pages/configuration/build-image/)

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Root directory | `wishlist-web` |
| Build command | `npm ci --include=dev && npm run build` |
| Build output directory | `dist` |
| `NODE_VERSION` | `22.22.2` or a newer supported 22.x release |
| `SKIP_DEPENDENCY_INSTALL` | `true` |
| `VITE_API_URL` | Exact Render HTTPS origin, for example `https://wishlist-api.onrender.com` |

Use scheme and hostname only for both origins. Exclude trailing slashes,
paths, and the local `/api` prefix. If Pages assigns a different hostname
from the one configured on Render, update `CORS_ORIGIN` and redeploy the API.
Additional intended origins, such as a custom domain, can be added as
comma-separated exact origins with no spaces. Keep `DATABASE_URL` and
`JWT_SECRET` on Render only. `VITE_API_URL` is public and baked into the
frontend bundle, so rebuild Pages when it changes.

The build produces `dist/index.html` with no top-level `404.html`. Pages
serves the SPA for direct requests to routes such as `/connection` and
`/wishlist`. [Pages SPA serving behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/)

### 4. Verify the live deployment

1. Confirm Render reports a healthy deploy and the public `/health` URL
   returns HTTP 200. In Neon's SQL Editor, check
   `SHOW server_version;` and `SELECT name FROM migrations;` for PostgreSQL 16
   and `WishlistSchema1795300000000`.
2. Open **API connection** on Pages and confirm it reports a healthy API. In
   the browser network panel, check that the health request reaches the Render
   HTTPS origin with no `/api` prefix and succeeds without a CORS error.
3. Open the Pages `/login` URL directly in a private browser window and
   reload it. Confirm the React sign-in page renders both times.
4. Register a test account on the fresh deployment and sign in. On **My
   wishlist**, create a wish and reload the page. Confirm the signed-in
   session and saved wish are still present.

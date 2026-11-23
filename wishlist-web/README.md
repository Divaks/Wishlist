# Wishlist Web

React frontend for Wishlist with account, group, and wish management.

## Prerequisites

- A current Node.js 22 LTS release (22.22.2 or newer for the test runner) and npm.
- For live API requests, run the NestJS backend separately on port 3000. Its setup is documented in the [repository setup guide](../README.md#локальний-запуск).

## Local development

From the repository root:

```sh
cd wishlist-web
nvm install
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:5173 and select **API connection**, or run `curl --fail http://localhost:5173/api/health` to check the proxy. During development, Vite proxies `/api` to `http://localhost:3000` and strips the prefix. For example, `/api/auth/login` reaches NestJS at `/auth/login`.

### Environment

| Variable       | Default | Purpose                                                                   |
| -------------- | ------- | ------------------------------------------------------------------------- |
| `VITE_API_URL` | `/api`  | Base URL for API requests. Use a same-origin path or an absolute API URL. |

Vite exposes `VITE_*` variables to browser code. For deployment, configure the host to serve `index.html` for frontend routes and forward `/api` to NestJS with the same prefix rewrite, or set `VITE_API_URL` at build time to a backend origin with CORS configured.

## npm scripts

| Command                | Purpose                                                                |
| ---------------------- | ---------------------------------------------------------------------- |
| `npm run dev`          | Start the Vite development server.                                     |
| `npm run build`        | Type-check and build to `dist/`.                                       |
| `npm run preview`      | Serve the built frontend for local preview.                            |
| `npm run lint`         | Run ESLint with zero warnings allowed.                                 |
| `npm run lint:fix`     | Apply ESLint fixes.                                                    |
| `npm run format`       | Format files with Prettier.                                            |
| `npm run format:check` | Check formatting with Prettier.                                        |
| `npm test`             | Run the Vitest suite once with jsdom and MSW.                          |
| `npm run typecheck`    | Check application and Vite configuration types without emitting files. |

## Source layout

| Directory         | Contents                                                               |
| ----------------- | ---------------------------------------------------------------------- |
| `src/app/`        | Query client, router and authentication providers.                     |
| `src/routes/`     | Route definitions and authentication guard.                            |
| `src/features/`   | Home, authentication, profiles, groups, wishes and API diagnostics.    |
| `src/components/` | Responsive layout shell and shadcn/ui primitives.                      |
| `src/hooks/`      | Shared hooks, including `useAuth`.                                     |
| `src/lib/api/`    | Typed JSON fetch client.                                               |
| `src/types/`      | Request and response types based on the current NestJS implementation. |
| `src/test/`       | Vitest setup, MSW handlers and tests.                                  |

The shared color tokens and DM Sans typography are configured in `src/index.css`. The header theme button switches between light and dark themes and saves the choice in `wishlist.theme` in localStorage. Without a saved choice, the theme follows the system preference. The initial theme is applied in `index.html` before the app renders. The gift image lives in `src/assets/`, and the font license notices live in `public/font-licenses/`. The shadcn/ui configuration lives in `components.json`, with Button, Input, Card and Label source in `src/components/ui/`.

Wish cards display prices in UAH and open store links in a new tab. The current API supplies no currency, image, or category fields, so cards use a generic gift icon instead of product previews.

## Routes

- Public routes are `/`, `/login`, `/register`, and `/connection`.
- Sign in to access `/profile`, `/groups`, `/groups/:groupId`, `/wishlist`, and `/wishlist/:wishId`.
- The frontend attaches the bearer token to API requests. NestJS enforces group membership, ownership, and reservation rules.

## Current API behavior

- `POST /auth/register` returns `{ id, email, name }`. Call `POST /auth/login` to obtain an access token. Login returns HTTP 201.
- `GET /users/profile` returns `{ userId, email, name, birthday }`. Group responses use `id` for their nested users.
- `POST /groups/:id/members` returns a pending invitation. Delete group, delete wish and unreserve wish return HTTP 204.
- The auth provider persists the token in local storage. An HTTP 401 for the current session clears the token and redirects to `/login`. Cookie-based auth and OpenAPI type generation depend on future backend support.

## Check the frontend against the backend

1. Open **API connection** to verify the health endpoint through the Vite proxy.
2. Create two test accounts in separate browser sessions. In **Profile**, save a name and birthday, then reload to check persistence.
3. Create a group and a wish as the first user. Invite the second user by email and accept the invitation in their **Groups** page. Pending invitations display a group ID because the API only returns the ID.
4. As the second user, open the group, filter wishes by member, then reserve and cancel the first user's wish. Lists use paged endpoints automatically; create more than five items to exercise **Previous** and **Next**. Group member filters are horizontal chips; manage members and invitations under **Members & Settings**.
5. As the owner, remove a member or transfer ownership. As a member, leave the group. Use the relevant owner session to delete the test group, then delete the test wishes and accounts.

# Architecture

Wishlist has two independently installed TypeScript applications and a shared
local PostgreSQL service. The browser calls the API over HTTP with JSON and
bearer JWTs. The API owns authorization and persistence.

## Backend

NestJS 11 uses Express, Passport JWT, bcrypt, class-validator,
class-transformer and TypeORM with PostgreSQL 16. [AppModule](../couple-wishlist-api/src/app.module.ts)
registers auth, users, groups and wishlist modules and the public health
controller. Controllers bind routes and validate inputs through DTOs and pipes.
Services enforce domain rules and use repositories for persistence. Entities
map to SQL tables. The groups service uses parameterized SQL for a separate
migration-managed invitation table.

Auth handles registration and token issuance with the users service. The users
module owns profile and account lifecycle. The groups module handles memberships,
invitations, ownership and shared wish reads. The wishlist module manages personal wishes and
reservations. Wish responses pass the viewer identity to a shared DTO.

## Frontend

React 19 and strict TypeScript run under Vite. React Router defines routes,
TanStack Query manages server state, and a small React Context handles auth.
Features cover home, connection diagnostics, login and registration, profile,
groups and wishes. Forms use React Hook Form and Zod. Tailwind and shadcn/ui
share the typography and color tokens in [index.css](../wishlist-web/src/index.css).

[AppRoutes](../wishlist-web/src/routes/app-routes.tsx) exposes public
`/`, `/connection`, `/login` and `/register`. Signed-in users visiting auth
pages go to `/`. The profile, group list and detail, and wishlist list and
detail routes require a token via `ProtectedRoute`. Unknown URLs redirect to
`/`. The connection page checks the API's public health endpoint.

## Integration

The [shared fetch client](../wishlist-web/src/lib/api/client.ts) handles JSON,
empty responses and HTTP errors. Query and mutation hooks wrap API operations.
The frontend [API types](../wishlist-web/src/types/api.ts) track the controllers,
DTOs and services. See [API contracts](api-contracts.md) for stable behavior and
[deployment](deployment.md) for the development proxy and hosting assumptions.

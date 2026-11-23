# AGENTS.md

## Project Overview

Wishlist is a full-stack web application for creating, managing, and sharing wish lists with friends, family, and other users.

The main purpose is to help groups of people organize birthday, Christmas, New Year, and other holiday gifts.

The repository is a monorepo containing:

- `couple-wishlist-api/` — Backend API.
- `wishlist-web/` — Frontend application.

### Core Business Logic

- Every user has a unique ID and their own account.
- Users can create and manage groups.
- Group owners invite existing users by email. A pending invitation grants no access until the recipient accepts it.
- Users belonging to the same group can view each other's wish lists.
- Users can create, edit, and delete their own wishes.
- Every wish must be associated with its creator through a `userId` or equivalent ownership field.
- Users must not be able to modify or delete wishes belonging to other users.
- Access to wishes must respect group membership and ownership rules.

The application should prioritize privacy, security, simplicity, and a good user experience.

---

# 1. Technology Stack

## Backend

Located in `couple-wishlist-api/`.

- Node.js
- NestJS 11
- TypeScript
- TypeORM
- PostgreSQL 16
- Passport
- JWT authentication
- bcrypt
- class-validator
- class-transformer

Testing:
- Jest
- Supertest

Infrastructure:
- Docker
- Docker Compose

## Frontend

Located in `wishlist-web/`.

- React (latest stable version)
- TypeScript (strict mode)
- Vite
- React Router
- TanStack Query
- React Hook Form
- Zod
- Tailwind CSS
- shadcn/ui

Testing:
- Vitest
- React Testing Library
- MSW

Code quality:
- ESLint (flat config)
- Prettier

Runtime:
- Node.js 22 LTS, as pinned by `wishlist-web/.nvmrc`
- npm

Use the versions and package manager already configured in the respective application.

Do not introduce additional frameworks or replace existing technologies without a clear technical reason.

---

# 2. Repository Structure

The repository is organized as a monorepo.

```text
Wishlist/
├── couple-wishlist-api/
│   └── Backend application
├── wishlist-web/
│   └── Frontend application
├── .github/
│   └── workflows/
│       └── ci.yml
├── docker-compose.yml
├── .gitignore
└── AGENTS.md
```

The frontend source and configuration are organized as follows:

```text
wishlist-web/
├── public/font-licenses/
├── src/
│   ├── app/
│   ├── assets/
│   ├── routes/
│   ├── features/
│   │   ├── auth/
│   │   ├── connection/
│   │   ├── home/
│   │   ├── groups/
│   │   ├── profile/
│   │   └── wishes/
│   ├── components/
│   │   └── ui/
│   ├── lib/
│   │   └── api/
│   ├── hooks/
│   ├── test/
│   ├── types/
│   ├── index.css
│   └── main.tsx
├── .env.example
├── .nvmrc
├── package.json
├── package-lock.json
├── components.json
├── README.md
└── vite.config.ts
```

Follow the existing structure and conventions. Additional folders may be introduced when justified.

---

# 3. Development Principles

1. Always inspect the existing project structure before making changes.
2. Follow the existing architecture, naming conventions, and coding style.
3. Prefer small, focused changes over unnecessary refactoring.
4. Reuse existing services, repositories, DTOs, hooks, components, and utilities.
5. Avoid duplicated business logic.
6. Keep responsibilities separated.
7. Use TypeScript types properly.
8. Avoid `any` unless absolutely necessary.
9. Do not add dependencies when existing packages can solve the problem.
10. Do not modify unrelated files.

## Important: Backend and Frontend Separation

- Backend and frontend are separate applications.
- Each application has its own `package.json`, dependencies, scripts, and configuration.
- Frontend tasks must not modify backend files.
- Backend tasks must not modify frontend files unless explicitly requested.
- Shared configuration changes must be carefully reviewed.
- Do not move files between applications without a clear reason.

When working on frontend tasks, treat `couple-wishlist-api/` as read-only.

---

# 4. Backend Development

## Architecture

Backend is built with NestJS.

Follow NestJS modular architecture.

- Controllers handle HTTP requests and responses.
- Services contain business logic.
- Modules organize application functionality.
- DTOs define and validate incoming data.
- Entities represent database models.
- Guards handle authentication and authorization.
- Repositories handle database access through TypeORM.

Keep responsibilities separated.

Before creating a new module, service, entity, or DTO, check whether an equivalent implementation already exists.

## Database Rules

- PostgreSQL is the primary database.
- Use TypeORM for database operations.
- Follow existing entity relationships and naming conventions.
- Use proper foreign keys and database constraints.
- Avoid unnecessary database queries.
- Prevent N+1 query problems where possible.
- Use transactions for operations that require atomicity.
- Never expose database entities directly when an existing DTO or response model should be used.
- Preserve existing data.

Be especially careful with TypeORM migrations.

- Never generate destructive migrations without examining their impact.
- Do not use automatic schema synchronization in production.
- Follow the project's existing migration strategy.

## Authentication and Security

- Use JWT authentication and existing Passport strategies.
- Hash passwords using bcrypt.
- Never store or expose plaintext passwords.
- Never expose password hashes in API responses.
- Validate incoming data.
- Protect private endpoints using appropriate authentication guards.
- Implement authorization checks on the server side.
- Never trust user IDs supplied by the client when they can be obtained from the authenticated user.
- Never hardcode secrets.

### Ownership and Group Access

Always enforce these rules:

1. A user can manage their own wishes.
2. A user cannot modify or delete another user's wishes.
3. A user can view another user's wishes only when authorized through shared group membership.
4. A user cannot access private group resources without membership.
5. Group membership and ownership must be checked on the backend.
6. Knowing a resource ID must never be sufficient to access it.

---

# 5. Frontend Development

## General Rules

- Use React with functional components and hooks.
- Use TypeScript strict mode.
- Prefer small, reusable components.
- Separate UI components from business logic.
- Keep components focused on a single responsibility.
- Avoid unnecessary global state.
- Use TanStack Query for server state.
- Use React Context for lightweight application-wide state, such as authentication.
- Use React Hook Form and Zod for form handling and validation.
- Use React Router for navigation.
- Use Tailwind CSS for styling.
- Use shadcn/ui components where appropriate.

## Component Guidelines

- Use functional components.
- Use explicit TypeScript interfaces or types for component props.
- Avoid unnecessarily large components.
- Extract reusable logic into custom hooks.
- Avoid duplicating UI elements.
- Keep feature-specific components inside their respective feature directories.
- Put genuinely shared components in `src/components/`.

Do not introduce Redux or another global state management library without a clear technical reason.

## Routing

Use React Router.

Public routes are `/`, `/connection`, `/login`, and `/register`. Signed-in users visiting the auth pages go to `/`.

`ProtectedRoute` guards `/profile`, `/groups`, `/groups/:groupId`, `/wishlist`, and `/wishlist/:wishId`. Unknown URLs redirect to `/`.

Authentication state must be checked before rendering protected content.

Redirect unauthenticated users to `/login`.

Do not rely on frontend route protection as a substitute for backend authorization.

## Authentication

Use a small React Context for authentication state.

Current implementation:

- Store the access token in memory.
- Persist the token in localStorage.
- Restore authentication state after page reload.
- Attach `Authorization: Bearer <accessToken>` to authenticated API requests.
- Handle HTTP 401 responses by clearing authentication state and logging the user out.

IMPORTANT SECURITY TODO:

Move token storage to secure httpOnly cookies when the backend supports the required cookie-based authentication flow.

Never expose tokens in logs or error messages.

## API Integration

Create a typed fetch wrapper in:

`src/lib/api/`

Requirements:

- Use `VITE_API_URL` as the API base URL.
- Attach JWT authorization headers when a token is available.
- Handle JSON requests and responses.
- Handle HTTP errors consistently.
- Handle 401 responses by logging out.
- Avoid duplicating fetch logic across components.
- Use TanStack Query for server-state fetching, caching, and mutations.

Use TypeScript interfaces for API request and response models.

Current API behavior:

- Registration returns `{ id, email, name }`. A separate login returns `{ accessToken }` with HTTP 201.
- Profile and account operations use `/users/profile` and `/users/account`. The profile GET response uses `userId`. Account deletion returns 409 while the user owns a group.
- `/groups` covers group CRUD, pending invitations, acceptance, member removal, ownership transfer, and leaving. Group wish lists support filtering by member.
- `/wishlist` covers personal wish CRUD. Reserve and cancel use `/wishlist/:id/reserve`. The owner cannot see whether their wish is reserved. Other members see its reservation status, and only the reserving user sees their own reservation identity.
- List endpoints return arrays. Their `/paged` variants and `/groups/:groupId/wishes/:memberId` return `{ data, total, page, limit, totalPages }`. Handle HTTP 204 for operations with no response body.
- `GET /health` is public and powers the frontend's `/connection` page.

Maintain frontend DTOs in `wishlist-web/src/types/api.ts` against the controllers, DTOs, and services. Route server state through the shared query and mutation hooks.

Inspect the actual backend implementation before integrating an endpoint.

If the backend contract differs, document the discrepancy instead of silently modifying the backend.

Future improvement:

Generate frontend API types from the backend OpenAPI specification using `openapi-typescript`.

Do not manually duplicate types indefinitely when generated types become available.

## UI and UX

The application is a shared gift wishlist platform.

Design principles:

- Mobile-first responsive design.
- Clean and intuitive interface.
- Consistent spacing and typography.
- Accessible controls and forms.
- Clear loading, error, empty, and success states.
- Reusable UI components.
- Use the shared palette and typography in `wishlist-web/src/index.css` with Tailwind CSS and shadcn/ui. Use the reserved color for reservation status and the sand color for tags.

Avoid excessive animations and unnecessary visual complexity.

Do not build product functionality unless explicitly requested.

When implementing placeholders, keep them minimal and clearly indicate unfinished functionality.

## Frontend Testing

Use:

- Vitest
- React Testing Library
- MSW

Tests should cover:

- Application rendering.
- Basic route rendering.
- Authentication-related behavior.
- API request handling.
- Loading and error states where appropriate.

Do not mock everything unnecessarily. Use MSW for API-level behavior.

---

# 6. Environment and Configuration

- Use environment variables for configuration.
- Never commit real `.env` files.
- Maintain `.env.example`.
- Frontend API URL should default to `/api`.
- Configure the Vite development proxy to forward `/api` requests to the backend at `http://localhost:3000`.
- Rewrite the `/api` prefix when forwarding requests if required by the backend routes.
- Keep frontend and backend configuration separate.
- Preserve compatibility with Docker Compose.

The backend reads the root `.env` when launched from `couple-wishlist-api/`. Compose uses the same file for PostgreSQL initialization. Set frontend overrides in `wishlist-web/.env.local` and treat every `VITE_*` value as public.

Follow the [root setup guide](README.md#локальний-запуск) and the [frontend README](wishlist-web/README.md). CI uses Node.js 24 for the backend and the frontend's `.nvmrc` for the frontend.

---

# 7. Code Quality

## Backend

- Write readable, maintainable, modular code.
- Use meaningful names.
- Handle expected errors explicitly.
- Avoid unnecessary comments.
- Follow existing NestJS conventions.

## Frontend

- Write readable React components.
- Prefer composition over complex components.
- Avoid unnecessary effects and derived state.
- Use proper TypeScript types.
- Avoid unnecessary re-renders.
- Follow ESLint and Prettier rules.
- Keep styling consistent.
- Avoid excessive dependencies.

Do not disable linting rules simply to make checks pass.

---

# 8. Testing and Verification

Testing is required when changing application behavior.

## Backend Commands

Run commands from `couple-wishlist-api/`.

- `npm run build`
- `npm run lint`
- `npm test -- --runInBand`
- `npm run test:e2e`
- `npm run test:smoke`

Inspect the actual scripts before execution.

## Frontend Commands

Run commands from `wishlist-web/`.

- `npm run lint`
- `npm run typecheck`
- `npm run format:check`
- `npm test`
- `npm run build`

Also verify that the Vite development server starts successfully.

## Testing Rules

- Add tests for new functionality.
- Test successful scenarios.
- Test invalid input and error handling.
- Test authentication and authorization.
- Test ownership and group access restrictions.
- Fix errors introduced by your changes.
- Do not claim tests pass unless they were actually executed.
- If tests cannot be executed, explain why.

---

# 9. CI/CD

The GitHub Actions workflow is located at:

`.github/workflows/ci.yml`

When modifying CI:

- Preserve existing backend jobs.
- Add or modify frontend jobs independently.
- Use the frontend's configured Node.js version.
- Install dependencies using the correct package manager.
- Run frontend typecheck, lint, tests, and build. The backend job runs lint, unit tests with coverage, build, and PostgreSQL E2E.
- Avoid breaking existing backend CI.

---

# 10. Git Rules

- Do not execute `git reset --hard`.
- Do not execute destructive Git commands.
- Do not discard uncommitted user changes.
- Never commit or push unless explicitly requested.
- Inspect `git status` before potentially disruptive operations.
- Keep modifications focused and reviewable.
- Use descriptive branch names.

---

# 11. AI Agent Working Instructions

Work as a pragmatic senior full-stack software engineer.

## Before Implementation

1. Understand the task.
2. Inspect relevant files.
3. Identify dependencies and affected components.
4. Check existing implementations before creating new ones.
5. Identify potential regressions.
6. Determine whether the task concerns backend, frontend, or both.

For straightforward tasks, proceed directly without lengthy planning.

For complex tasks involving architecture, database changes, or multiple modules, briefly outline the approach before implementation.

## During Implementation

- Prefer actual implementation over lengthy descriptions.
- Make changes directly when authorized.
- Do not ask for confirmation for ordinary, reversible code changes.
- Do not invent existing architecture or functionality.
- Do not silently change unrelated behavior.
- Run relevant checks after implementation.
- Inspect errors and fix issues introduced by your changes.
- Keep changes minimal and focused.

## Communication Style

- Respond in Ukrainian.
- Be concise and technical.
- Avoid excessive explanations.
- Do not repeat the user's task.
- Do not provide lengthy introductions.
- Do not narrate every tool call or minor action.
- Explain important architectural decisions only when necessary.

## Final Response

After completing a task, briefly report:

1. What was implemented or fixed.
2. Which files were modified.
3. Which tests and checks were executed.
4. Whether they passed.
5. Any remaining issues or limitations.

Do not provide lengthy summaries unless explicitly requested.

---

# 12. Source of Truth

The actual source code is the source of truth.

If this document conflicts with the existing implementation, inspect the implementation first.

Do not assume planned functionality already exists.

Preserve existing behavior unless the task explicitly requires changing it.

Never modify the backend during a frontend-only task.

## Code Review Guidelines

When reviewing pull requests:

- Check compliance with AGENTS.md.
- Identify security vulnerabilities and regressions.
- Verify authentication and authorization.
- Check for unauthorized access to other users' wishes.
- Verify group membership and ownership checks.
- Review TypeORM queries and database migrations.
- Check backward compatibility of API endpoints.
- Identify missing tests for critical business logic.
- Report actionable findings with file and line references.
- Do not report cosmetic or purely stylistic issues.
- Do not modify the code during review.
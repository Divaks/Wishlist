# Frontend instructions

## Structure

- Use functional React components with TypeScript strict mode.
- Keep feature code in `src/features/`, app providers in `src/app/`, and
  routing in `src/routes/`. Put shared UI and hooks in their existing folders.
- Keep UI changes scoped to the requested features. Clearly label unfinished
  placeholders when the task calls for them.

## API and session

- Use the typed JSON client in `src/lib/api/` and the shared TanStack Query
  hooks for server state and mutations. Preserve query invalidation and
  session isolation when changing cache behavior.
- Keep `src/types/api.ts` aligned with NestJS controllers, DTOs and services.
  Verify endpoint details in source. Report contract mismatches discovered
  during frontend-only work.
- Keep auth in the existing React Context. Preserve token restoration, bearer
  headers and current-session logout on HTTP 401. Handle empty 204 responses.
- Preserve React Router public routes, auth redirects and `ProtectedRoute`
  checks in `src/routes/`. The API enforces authorization.
- Default `VITE_API_URL` to `/api`. Preserve the Vite dev proxy prefix rewrite.
  Treat all `VITE_*` variables as public.

## Forms and UI

- Use React Hook Form and Zod. Surface field errors and API feedback.
- Use the Tailwind tokens and typography in `src/index.css` with the existing
  shadcn/ui primitives. Use the reserved color for reservation status and the
  sand color for tags.
- Keep mobile layouts, keyboard-accessible controls and loading, empty, error
  and success states.

## Verification

Run applicable commands here using the Node version in [`.nvmrc`](.nvmrc).

- `npm run lint`, `npm run typecheck` and `npm run format:check`.
- `npm test` for Vitest, React Testing Library and MSW.
- `npm run build` for the production build.
- Verify `npm run dev` starts when dev entry points or configuration change.

Use MSW at the HTTP boundary for coverage of routes, auth and API states.
See the [testing skill](../.agents/skills/testing/SKILL.md) for test selection.

## References

- [Frontend setup and browser checks](README.md).
- [Architecture](../docs/architecture.md) for features and routing.
- [API contracts](../docs/api-contracts.md) for payloads and status codes.

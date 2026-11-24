# Backend instructions

## Boundaries

- Use the existing NestJS modules for auth, users, groups and wishes.
- Keep HTTP routing, status codes and principal extraction in controllers.
  Put authorization and business logic in services and persistence in TypeORM.
- Reuse entities in `src/models/`, DTOs in `src/dto/` and module registrations
  in `src/modules/`. Keep responses explicit and avoid returning raw entities.
- Take the actor from `JwtAuthGuard` and `@GetUser`. A route parameter may
  identify a target user only. Keep bcrypt and the existing Passport strategy.
- Apply group and wish access predicates before reading or mutating scoped data.
  Use the viewer-aware wish DTO across all response paths, including mutations.

## Validation and persistence

- Preserve the global validation pipe's transformation and rejection of unknown
  properties. Validate DTOs, UUIDs and pagination at the boundary.
- Preserve legacy wish ID parsing through `WishIdPipe` and check response
  shapes, status codes and bodyless 204 responses before changing contracts.
- Use TypeORM repositories and parameterize custom SQL, including invitations.
  Keep list access checks scoped and avoid per-row relation fetches.
- Keep group owner role and `createdById` consistent in one transaction.
  Preserve the reservation membership lock and conditional write semantics.
- Treat both entity metadata and migration SQL as schema inputs. Register new
  migrations in `AppModule` and keep schema synchronization disabled.
- Assess existing data, locks, constraints and rollback before schema changes.

## Verification

Run applicable commands here after checking [package scripts](package.json).

- `npm run lint` and `npm run build`.
- `npm test -- --runInBand` for Jest unit tests.
- `npm run test:e2e -- --runInBand` for PostgreSQL and Supertest integration.
- `npm run test:smoke` against an isolated running API and database.
- `npm run lint:fix` and `npm run format` write files. Keep review checks read-only.

See the [test workflow](../.agents/skills/testing/SKILL.md) for test selection
and database prerequisites.

## References

- [API contracts](../docs/api-contracts.md) for routes and compatibility.
- [Database](../docs/database.md) and [migration workflow](../.agents/skills/database-migration/SKILL.md)
  for schema or transaction changes.
- [Security](../docs/security.md) for auth and application protections.

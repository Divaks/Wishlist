---
name: testing
description: Select, add, update, or run Wishlist unit, PostgreSQL E2E, smoke, or frontend tests.
---

Choose checks from the changed behavior or requested verification. Confirm
scripts in the [API package](../../../couple-wishlist-api/package.json) and
[web package](../../../wishlist-web/package.json) before running them.

| Scope | Command from its application directory |
| --- | --- |
| Backend DTO, guard or service logic | `npm test -- --runInBand <suite-path>` in the API |
| HTTP and PostgreSQL invariants | `npm run test:e2e -- --runInBand` in the API |
| Running API workflow | `npm run test:smoke` in the API |
| React routes, components or HTTP state | `npm test -- <suite-path>` in the web app |

Use backend Jest unit tests in `__tests__/unit/`, Supertest E2E with PostgreSQL
for real constraints and transactions, and React Testing Library with MSW
in `src/test/` for client regressions. Verify success, invalid input and error
handling as applicable. For permission changes test unauthorized users,
pending and former members, owners and other users. For reservations assert
viewer-specific fields and use concurrent HTTP requests in PostgreSQL E2E to
verify a single winner. See [business rules](../../../docs/business-rules.md).

Read E2E and smoke setup in the [root README](../../../README.md#перевірки).
E2E creates and drops an isolated database and needs a PostgreSQL role with
CREATEDB. Smoke writes to a running API, so use an isolated test instance.
Plain lint, typecheck and format checks inspect source. Fix and format scripts
rewrite it. Builds and coverage generate artifacts.

Report the commands run, outcomes, omitted checks and environment limitations.
Select relevant coverage instead of running every suite by default.

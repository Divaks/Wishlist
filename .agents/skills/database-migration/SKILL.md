---
name: database-migration
description: Review or implement explicitly requested PostgreSQL schema changes and TypeORM migrations for Wishlist.
---

1. Read the [database guide](../../../docs/database.md), then inspect the current
   entities, registered migrations and legacy upgrade tests. Check current
   schema and existing rows through authorized, read-only inspection if needed.
2. Assess foreign keys, delete behavior, nullability, unique constraints and
   indexes. Check normalized email collisions, legacy IDs and ownership
   consistency when relevant. Keep model metadata aligned with migration SQL.
3. Preserve data and compatibility during rollout. Evaluate locks, transaction
   boundaries and concurrent writes. Define preflight checks and the rollback
   or backup-restore procedure before applying changes.
4. Register requested migrations using the project strategy. Keep production
   synchronization disabled. Verify on disposable PostgreSQL using fresh and
   representative legacy schemas, then run relevant E2E tests.
   Keep destructive migration verification away from production.

For implementation, summarize the schema changes, data impact, lock and
rollout constraints, recovery procedure and checks. For review, return
evidence-based findings and leave source and schema untouched.

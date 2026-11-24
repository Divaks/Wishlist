# Database

[AppModule](../couple-wishlist-api/src/app.module.ts) configures PostgreSQL via
TypeORM and `DB_*` variables. It disables schema synchronization and runs the
registered migrations at startup. PostgreSQL 16 is used by [Compose](../docker-compose.yml)
and [CI](../.github/workflows/ci.yml).

## Schema

| Table | Relationships and constraints |
| --- | --- |
| `user` | UUID primary key. Email has raw and lowercase uniqueness. Password hash is excluded from ordinary selects. |
| `group` | UUID primary key and required `createdById` user FK for the current owner. |
| `group_member` | Unique group/user pair with foreign keys and an owner/member enum. A partial unique index permits at most one owner per group. Group deletion cascades. |
| `group_invitation` | Migration-managed SQL table. Group and user FKs form its composite primary key and cascade on deletion. |
| `wish_item` | UUID primary key, nullable owner and reserver user FKs, numeric(10,2) price, currency and priority enums, timestamps and a nullable S3 `photoKey`. The service assigns owners on creation. |
| `wish_photo_cleanup` | One row per staged or obsolete S3 key. An index supports polling by retry time. |

The [entity mappings](../couple-wishlist-api/src/models/) and
[schema migration](../couple-wishlist-api/src/migrations/1795300000000-wishlist-schema.ts)
are both relevant. The database permits nullable wish owners and at most one
owner membership. The service ensures each new wish has an owner and each group
has a current owner consistent with the membership role.

## Transactions and concurrency

Group creation inserts the group and its owner membership together. Ownership
transfer locks the group, updates roles and changes the owner FK transactionally.
Invitation acceptance consumes the pending row and inserts the membership in one
statement inside a transaction. Account deletion locks the user and clears
dependent rows within the same transaction.

Reservation checks shared membership with a pessimistic read lock in the
transaction. A conditional update on a null reserver permits a single winner.
Cancellation guards the update by reserver ID. Preserve these predicates and
transaction boundaries when changing the model.

## Legacy upgrade and rollback

The current migration normalizes email and stops on case-insensitive collisions,
converts mutual partner pairs into groups, retains the legacy partner mapping
and maps old integer wish IDs to UUIDs. It preserves wishes and reservations.
Its `down()` directs operators to restore a pre-migration backup.
See the [upgrade procedure](../README.md#міграція-зі-старої-партнерської-схеми)
and [legacy E2E coverage](../couple-wishlist-api/__tests__/e2e/app.e2e-spec.ts).


## Wish photo migration and cleanup

[The photo migration](../couple-wishlist-api/src/migrations/1795300000001-wish-photos.ts)
adds a nullable column without a data backfill. Existing wishes begin with no
photo. The ALTER TABLE takes an exclusive lock on `wish_item` during startup
migration. Take a database backup and apply during a period with low write
traffic after checking for long-running transactions.

The API commits a staging entry before writing an object. It locks that
entry during upload and clears it in the same transaction as the owner-scoped
attachment. The wish row serializes concurrent attachments and removals.
A trigger queues the previous key in the transaction that replaces or clears
it, including wish and account deletion. The cleanup worker sees committed
entries, skips rows locked by other workers, and retries failed deletes.
An unacknowledged upload leaves its staging entry due after 15 minutes.
An acknowledged upload whose attachment fails is eligible at the next poll.

Before reverting, stop new photo writes, keep the configured API and worker
available to remove existing photos, and wait for the queue to drain.
The migration refuses to revert while any attached photos or cleanup entries
remain. For recovery that must preserve photos, restore the database and
matching S3 objects from coordinated backups.

## Wish currency migration

The currency migration adds a required enum column with a `UAH` default.
Existing numeric prices stay the same. PostgreSQL takes an exclusive lock on
`wish_item` during the alteration. Apply at startup during low write traffic
after taking a backup. Reverting drops the selected currencies, so restore the
backup if those selections must be recovered.

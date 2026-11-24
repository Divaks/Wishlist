# Business rules

The [root instructions](../AGENTS.md) define mandatory invariants. These
workflows describe current behavior in the services.

## Accounts and groups

| Operation | Actor and effect |
| --- | --- |
| Register | A new account has its own UUID. Email is normalized to lowercase and unique. Login is a separate operation. |
| Read or update a profile | The signed-in account acts on its own profile. Birthday is an optional calendar date and can be cleared. |
| Create a group | A signed-in user becomes its first member and owner in one transaction. |
| Read a group or its wishes | Current members have access. The member-specific wish list also requires the target to be a member of that group. |
| Rename, delete or invite to a group | Only the current owner can perform these operations. Deleting a group removes memberships and invitations. Wishes belong to users and survive. |
| Invite or accept | The owner invites an existing account by email. Pending invitations are separate from membership. The recipient can list their own invitations and accept one atomically. Acceptance consumes it and creates membership. |
| Remove or leave | An owner may remove a non-owner member. Any non-owner member can remove their own membership by leaving. |
| Transfer ownership | The current owner transfers to another existing member. The outgoing owner stays as a member. Both roles and the group owner reference change together. |
| Delete an account | The account owner can delete it after transferring or deleting every group they own. Deletion clears their reservations, wishes, memberships and pending invitations. |

See [GroupsService](../couple-wishlist-api/src/services/groups.service.ts)
and [UsersService](../couple-wishlist-api/src/services/users.service.ts).

## Wishes and reservations

- Wish creation assigns the actor as owner. The personal wishlist endpoints
  scope read, edit and delete to the owner. Other users read through a shared
  group's wishlist routes.
- A member can reserve another member's wish if they share an active group.
  Pending invitations are insufficient. Self-reservation fails.
- Concurrent reservations for the same available wish have one winner.
  The API returns 409 when the conditional reservation update loses.
- Only the reserver can cancel. Cancellation checks the reservation holder
  directly, so cancellation is possible after shared membership ends.
  Group removal and leaving do not automatically cancel reservations.
- The owner always sees `isReserved: false` with null reservation identity.
  Other authorized viewers see whether there is a reservation. Only the
  reserver sees their own ID, and their nested profile appears only when loaded.
- Ownership is required for new wish writes. Legacy records remain compatible
  with the existing nullable database column.

See [WishlistService](../couple-wishlist-api/src/services/wishlist.service.ts),
[WishResponseDto](../couple-wishlist-api/src/dto/wishlist/wish-response.dto.ts)
and the [PostgreSQL E2E](../couple-wishlist-api/__tests__/e2e/app.e2e-spec.ts).

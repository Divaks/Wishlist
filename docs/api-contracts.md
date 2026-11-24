# API contracts

Paths below are relative to NestJS. The frontend defaults to a browser-facing
`/api` base. [Controllers](../couple-wishlist-api/src/controllers/) define
methods and status codes. [DTOs](../couple-wishlist-api/src/dto/) and
[services](../couple-wishlist-api/src/services/) define validation and payloads.
The repository currently maintains [frontend types](../wishlist-web/src/types/api.ts)
by hand. Generating them with `openapi-typescript` depends on backend
OpenAPI support.

| Operation | Contract |
| --- | --- |
| `GET /health` | Public. Returns `{ status: "ok", timestamp }`. |
| `POST /auth/register` | Public. Accepts email, password and optional name. Returns 201 with `{ id, email, name }`. |
| `POST /auth/login` | Public. Accepts email and password. Returns 201 with `{ accessToken }`. |
| `GET /users/profile` | Returns `{ userId, email, name, birthday }`. |
| `PATCH /users/profile` | Update allowed profile fields. Birthday accepts `YYYY-MM-DD` or null. The response uses `id`. |
| `DELETE /users/account` | Returns 204 on deletion or 409 while the account owns a group. |
| `GET/POST /groups`, `GET/PATCH/DELETE /groups/:groupId` | List, create, read, edit and delete groups. Group responses include member and owner profiles. Delete returns 204. |
| `POST /groups/:groupId/members` | Invite by email. Returns 201 with group ID, user ID and pending status. |
| `GET /groups/invitations`, `POST /groups/:groupId/invitations/accept` | List the caller's invitations as `{ groupId }` entries, or accept one for 204. |
| `DELETE /groups/:groupId/members/:targetUserId`, `DELETE /groups/:groupId/leave` | Remove a member or leave as a non-owner. Returns 204. |
| `POST /groups/:groupId/members/:targetUserId/transfer-ownership` | Transfer to an existing member. Returns 204. |
| `GET /groups/:groupId/wishes`, `GET /groups/:groupId/wishes/:memberId` | All group wishes as an array or one member's wishes as a paginated object. |
| `GET/POST /wishlist`, `GET/PATCH/DELETE /wishlist/:id` | Personal wish list, create, read, update and delete. Delete returns 204. |
| `PUT/DELETE /wishlist/:id/photo` | Upload, replace or remove an owned wish photo. Both methods return 204. |
| `POST/DELETE /wishlist/:id/reserve` | Reserve another member's wish for 201 or cancel your own reservation for 204. |

Protected paths use `Authorization: Bearer <accessToken>`. Nest validates
inputs with transformation, whitelisting and rejection of unknown fields.
The API uses 400 for validation and self-reservation, 401 for invalid auth,
403 for forbidden group operations, 404 for missing or inaccessible resources
where applicable, 409 for conflicts and 429 for rate limiting. See controller
tests and [smoke scenarios](../couple-wishlist-api/__tests__/test-api.ts) for
endpoint-specific cases. The client treats empty bodies as undefined, turns
HTTP errors into `ApiError`, and routes 401 through the auth provider.

## Lists and IDs

The array endpoints `GET /groups`, `GET /wishlist` and
`GET /groups/:groupId/wishes` retain their array shapes. Their `/paged` variants
and the member-specific wish route return `{ data, total, page, limit, totalPages }`.
Page and limit are positive integers with defaults 1 and 20. Limit is capped at
100 by validation. An empty collection has zero total pages. Group and user
path IDs use UUIDs. [WishIdPipe](../couple-wishlist-api/src/wish-id.pipe.ts)
also accepts positive decimal wish IDs up to 2147483647. Responses use UUIDs.
The migration also converts bigint columns, so larger legacy IDs can require
using their migrated UUIDs.

## Reservation fields

The [viewer-aware DTO](../couple-wishlist-api/src/dto/wishlist/wish-response.dto.ts)
returns `isReserved`, `reservedById` and `reservedBy` following the
[business rules](business-rules.md). In the all-members group list the query
excludes the viewer from the joined reserver object. Clients should use
`reservedById` to identify their own reservation because the nested object can
be null even when the caller holds it.


## Wish photos

`PUT /wishlist/:id/photo` accepts exactly one multipart file named `photo`.
The API decodes JPEG, PNG and WebP based on their bytes, with a 5 MiB file
limit and a 25-megapixel decode limit. The multipart body may include up to
64 KiB of overhead beyond the file limit. Invalid content or fields return
400, oversized bodies or files return 413, and missing or unowned wishes
return 404. Uploads return 503 if storage is unconfigured or the S3 write
fails. `DELETE /wishlist/:id/photo` is idempotent for an existing owned wish.

All wish responses include `photoUrl`, a presigned S3 GET URL valid for up to
five minutes, or `null` when a photo URL is unavailable. The usual ownership
and accepted group membership checks apply before signing. Pending or removed
members receive no fresh URLs through that group. Previously issued URLs
can continue working until they expire or the S3 object is deleted.
The response exposes the URL through `photoUrl` only. The JSON create and
edit payloads retain the separate product `link` and photo changes use
the multipart and delete routes.

## Wish currency

Wish responses include `currency`. JSON create and update requests accept `UAH`,
`EUR` or `USD`. Omission defaults to `UAH` on creation and preserves the
stored currency on update. Changing currency leaves the numeric price as entered.

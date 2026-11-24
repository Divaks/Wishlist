# Security

## Authentication and session

The API hashes passwords with bcrypt. Passport reads bearer JWTs, validates
signature and expiration and resolves the current user from the subject.
The [auth module](../couple-wishlist-api/src/modules/auth.module.ts) requires
a non-placeholder JWT secret of at least 32 characters and signs one-day tokens.
Deleting the user prevents their token from resolving to an active account.
Keep raw credentials and hashes out of API responses and logs.

The [web auth provider](../wishlist-web/src/app/auth-provider.tsx) keeps the token
in React state and localStorage for reloads. A token change clears the query
cache. A 401 clears only the session whose token is still current. Browser
storage is readable by JavaScript. The existing TODO is to migrate to secure
HttpOnly cookies when backend cookie authentication and refresh are available.

## Authorization and exposure

JWT guards establish identity. Services enforce group, membership and ownership
rules. Pending invitations are scoped to the recipient and confer no group
privileges. Wish responses receive the viewer ID to mask reservation status from
owners and reservation identity from other members.
Group responses currently include member and owner emails and birthdays.
Nested user summaries in wish responses include ID, name and birthday.
See the [permission matrix](business-rules.md).

[App configuration](../couple-wishlist-api/src/configure-app.ts) enables Helmet,
configurable CORS and strict DTO whitelisting. [AppModule](../couple-wishlist-api/src/app.module.ts)
registers the global throttler at 100 requests per 60 seconds. Use parameterized
SQL for invitation queries and configured origins for direct browser requests.

## Configuration

Use [environment templates](../.env.example) and private runtime variables for
database credentials and JWT secrets. Keep real files, tokens and credentials
out of version control. Every `VITE_*` value is public browser configuration.
See [deployment](deployment.md) for environment precedence and routing.

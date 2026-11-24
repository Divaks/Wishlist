# Development, build and deployment

Follow the [local setup](../README.md#локальний-запуск) to install each package
with npm, start PostgreSQL, configure the API and run Vite. The API package
supports Node.js 22.12+ in the 22 line or Node.js 24. CI uses 24 for the API.
The web package pins Node.js 22 via [`.nvmrc`](../wishlist-web/.nvmrc) and its
[setup guide](../wishlist-web/README.md#prerequisites) specifies 22.22.2 or
newer in that line for tests.

## Environment and Compose

[Compose](../docker-compose.yml) starts PostgreSQL 16 with a named volume and
takes initialization values from the root environment. Start the API and
frontend separately. Preserve credential and database settings for existing
volumes. When the API starts from its own directory, process variables take
precedence over `.env.${NODE_ENV ?? "local"}`, then `.env` and `../.env`.
Use the [root template](../.env.example) and the
[web template](../wishlist-web/.env.example) for local configuration.

Vite proxies `/api` to `http://localhost:3000` and removes the prefix in
development. Frontend overrides belong in `wishlist-web/.env.local`.

## Builds and verification

| App | Build and local execution | CI |
| --- | --- | --- |
| API | `npm run build`, then `npm run start:prod`. Startup applies registered migrations. | Install with `npm ci`, run ESLint, Jest with coverage, build and PostgreSQL E2E. |
| Web | `npm run build` produces `dist/`. Use `npm run preview` for local preview. | Install with `npm ci`, then typecheck, lint, test and build. |

See the [CI workflow](../.github/workflows/ci.yml) for exact commands and
the [README](../README.md#перевірки) for test database and smoke setup. Keep
API and web CI checks independent and use each package’s lockfile and Node
version when changing a job.

A static frontend host needs an SPA fallback to `index.html` for frontend
routes. Keep the `/api` prefix rewrite in a same-origin proxy, or supply an
absolute `VITE_API_URL` at build time and configure the API's CORS origins.
The repository defines CI and local database infrastructure. Production
hosting and release procedures are environment-specific.


## Wish photo storage

Set `WISH_PHOTO_BUCKET` to a private S3 bucket name and `WISH_PHOTO_REGION`
to its AWS region in the API environment. Both values are required for
uploads and the cleanup worker. The API uses the AWS SDK v3 default Node.js
credential provider chain. Use a workload IAM role or a local AWS profile
with credentials resolved by that chain. Keep S3 public access blocked.
Use a bucket with versioning disabled for permanent removal through normal
cleanup. For a versioned bucket, configure a lifecycle rule for noncurrent
versions under `wish-photos/`.

Grant the API identity `s3:PutObject`, `s3:GetObject` and `s3:DeleteObject`
on `arn:aws:s3:::YOUR_BUCKET/wish-photos/*`. If the bucket uses a
customer-managed KMS key, allow `kms:GenerateDataKey` for upload and
`kms:Decrypt` for reads. A frontend content security policy must allow the
bucket endpoint for images and `blob:` for local previews. A reverse proxy must
allow a multipart body of at least 5 MiB plus 64 KiB on the upload route.
The API polls for committed cleanup entries every 30 seconds and reschedules
a failed S3 deletion after one minute. Monitor recurring cleanup warnings and
the age of due entries in `wish_photo_cleanup`.

With PostgreSQL, the API and Vite running locally, open **My wishes**, select
a JPEG, PNG or WebP and create a wish. Confirm the detail and personal card
show the photo. As an accepted member in another browser session, verify the
group card shows it. As the owner, replace and remove the photo from the
detail page and reload the list. To exercise create-then-upload retry, start
the API without the storage settings, create a wish with a file, then restart
with the settings and use **Retry photo upload** on the same page. Automated
coverage runs with S3 mocked using `npm run test:e2e -- --runInBand` in the
API directory and `npm test` in the web directory.

See the [AWS SDK credential provider chain](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html)
and [S3 signing package](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-s3-request-presigner/).

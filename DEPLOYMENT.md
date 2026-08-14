# OmniQuery Production Deployment

This runbook deploys OmniQuery for a small real user base with MongoDB Atlas,
Supabase Storage, Groq, Upstash QStash, SMTP, Render, and Vercel.

Complete the sections in order because the gateway needs the final worker and
frontend URLs.

## 1. Prepare GitHub

Confirm environment files are ignored:

```powershell
cd C:\Users\joynn\OneDrive\Desktop\main-project
git check-ignore gateway\.env ai-worker\.env frontend\.env
git status --short
```

Push the repository to `master` or `main`. Do not stage an `.env` file.

## 2. MongoDB Atlas

Create a live Atlas cluster and database user with read/write access. Copy a
fresh Drivers SRV URI; the old `omnicluster.icbbp4j.mongodb.net` hostname is
dead and cannot be repaired in application code.

Use:

```text
Database: omniquery
Vector collection: vector_store
Status collection: document_status
Vector index: vector_index
```

Allow Render to reach Atlas. `0.0.0.0/0` is acceptable for the first controlled
deployment when the database user has a strong password, but restrict network
access later when stable outbound addresses are available.

Create an Atlas Vector Search index named `vector_index` on
`omniquery.vector_store`:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 384,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "tenant_id"
    }
  ]
}
```

Wait for the index to become active. The application creates its normal
MongoDB indexes automatically during startup.

## 3. Supabase Storage

Create a Supabase project and a private bucket:

```text
Bucket: documents
Allowed MIME types: application/pdf, application/x-pdf, text/plain, text/markdown, application/octet-stream
Maximum file size: 25 MB
```

Copy the project URL and service-role key. The service-role key belongs only in
the gateway and worker. Never expose it through a `VITE_` variable.

## 4. Groq

Create a Groq API key. The configured model is:

```text
GROQ_MODEL=openai/gpt-oss-20b
```

## 5. Upstash QStash

Create or open a QStash project and copy:

- QStash publish token
- Current signing key
- Next signing key

The gateway publishes processing jobs. The worker verifies both signing keys
before accepting a production webhook.

## 6. SMTP

Use any provider that exposes standard SMTP credentials. Collect:

```text
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASS
EMAIL_FROM
```

Production startup requires `REQUIRE_EMAIL_VERIFICATION=true`, `SMTP_HOST`, and
`EMAIL_FROM`. `SMTP_USER` and `SMTP_PASS` must either both be set or both be
omitted for an SMTP relay that does not require authentication.

Email links use `APP_BASE_URL`, which must be the final frontend origin.

## 7. Generate Application Secrets

Run this three times and keep each result separate:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Use the outputs as:

- `JWT_SECRET`: gateway only
- `INTERNAL_API_KEY`: identical in gateway and worker
- `METRICS_API_KEY`: identical in gateway and worker, or separate values if the
  monitoring system can store two credentials

## 8. Deploy The AI Worker To Render

Create a Render Web Service:

```text
Root directory: ai-worker
Runtime: Docker
Dockerfile: ./Dockerfile
Health check path: /health
```

Use at least 2 GB RAM. The worker loads PyTorch and the embedding model.

Environment:

```text
ENV=production
LOG_LEVEL=INFO
SUPABASE_URL=<Supabase project URL>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service-role key>
SUPABASE_BUCKET=documents
MONGO_URI=<Atlas SRV URI>
MONGO_DB=omniquery
MONGO_COLLECTION=vector_store
MONGO_VECTOR_INDEX=vector_index
MONGO_SERVER_SELECTION_TIMEOUT_MS=10000
MAX_PDF_PAGES=250
QSTASH_CURRENT_SIGNING_KEY=<current signing key>
QSTASH_NEXT_SIGNING_KEY=<next signing key>
INTERNAL_API_KEY=<shared internal secret>
METRICS_API_KEY=<monitoring secret>
GROQ_API_KEY=<Groq API key>
GROQ_MODEL=openai/gpt-oss-20b
```

Render supplies `PORT`. Deploy and verify:

```text
https://YOUR_WORKER_DOMAIN/health
```

## 9. Deploy The Gateway To Render

Create a second Render Web Service:

```text
Root directory: gateway
Runtime: Docker
Dockerfile: ./Dockerfile
Health check path: /api/health
```

Environment:

```text
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
FRONTEND_ORIGIN=https://YOUR_STABLE_FRONTEND_DOMAIN
APP_BASE_URL=https://YOUR_STABLE_FRONTEND_DOMAIN
MONGO_URI=<same Atlas SRV URI>
MONGO_DB=omniquery
JWT_SECRET=<gateway JWT secret>
SUPABASE_URL=<same Supabase project URL>
SUPABASE_SERVICE_ROLE_KEY=<same Supabase service-role key>
SUPABASE_BUCKET=documents
QSTASH_TOKEN=<QStash publish token>
QSTASH_TARGET_URL=https://YOUR_WORKER_DOMAIN/api/process-webhook
AI_WORKER_URL=https://YOUR_WORKER_DOMAIN
INTERNAL_API_KEY=<same shared internal secret>
METRICS_API_KEY=<monitoring secret>
REQUIRE_EMAIL_VERIFICATION=true
SMTP_HOST=<SMTP hostname>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<SMTP username>
SMTP_PASS=<SMTP password>
EMAIL_FROM=OmniQuery <no-reply@YOUR_DOMAIN>
MAX_UPLOAD_BYTES=26214400
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=20
```

For port 465, normally set `SMTP_SECURE=true`.

Verify:

```text
https://YOUR_GATEWAY_DOMAIN/api/health
```

## 10. Deploy The Frontend To Vercel

Import the GitHub repository:

```text
Framework preset: Vite
Root directory: frontend
Build command: npm run build
Output directory: dist
```

Set:

```text
VITE_GATEWAY_URL=https://YOUR_GATEWAY_DOMAIN
```

Use a stable production domain or custom domain. Put that exact origin in both
gateway variables:

```text
FRONTEND_ORIGIN
APP_BASE_URL
```

`frontend/vercel.json` provides the SPA rewrite for client-side routes.

## 11. Configure GitHub Continuous Deployment

In GitHub, create an environment named `production`. Add:

```text
RENDER_WORKER_DEPLOY_HOOK
RENDER_GATEWAY_DEPLOY_HOOK
WORKER_URL
GATEWAY_URL
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

Optional authenticated smoke credentials:

```text
SMOKE_EMAIL
SMOKE_PASSWORD
```

Create a deploy hook for each Render service and store the full hook URL as a
secret. Vercel project and organization IDs are available after linking the
project or in its project settings.

On a push to `master` or `main`, the workflow:

1. Builds and audits the frontend
2. Runs the Playwright browser journey
3. Tests and audits the gateway
4. Tests, compiles, and dependency-checks the worker
5. Runs k6 thresholds against the mock API
6. Triggers the worker deploy hook and checks health
7. Triggers the gateway deploy hook and checks health
8. Deploys the frontend through the Vercel CLI
9. Runs the production smoke script

When any required CD secret is missing, CI still passes and the deployment job
records a clean skip.

## 12. Production Verification

Open the frontend in a private browser:

1. Register a new account.
2. Open the verification email and activate it.
3. Sign in.
4. Upload a small text-based PDF.
5. Wait for `Ready`.
6. Ask a question whose answer appears in the PDF.
7. Open the source passage.
8. Refresh the browser and confirm the conversation remains.
9. Delete the PDF and confirm it disappears.
10. Invite a second email from Settings.
11. Accept the invitation and confirm both users see workspace documents.
12. Confirm each user keeps private conversation history.
13. Remove the second user and confirm old sessions no longer access the
    original workspace.

There are no temporary IDs or passwords.

## Monitoring

Health endpoints are public for Render:

```text
Gateway: /api/health
Worker: /health
```

Prometheus endpoints require `x-metrics-api-key`:

```text
Gateway: /api/metrics
Worker: /metrics
```

Both services emit JSON logs and `X-Request-ID`. Track at minimum:

- HTTP error rate and p95 duration
- Chat errors and latency
- Document processing failures and duration
- Worker memory and restart count
- QStash retries and dead-lettered jobs
- Atlas storage and Vector Search usage
- Supabase storage usage

## Troubleshooting

### `querySrv ECONNREFUSED` or `NXDOMAIN`

The Atlas hostname is dead, mistyped, or blocked by DNS. Copy a fresh Drivers
URI from the live cluster into both services.

### Upload succeeds but processing never becomes ready

Check the QStash target URL and signing keys, worker logs, Supabase project and
bucket names, Atlas connectivity, and whether the PDF contains extractable
text.

### Chat returns no useful context

Confirm the document is `ready`, the Atlas Vector Search index is active, the
index name is `vector_index`, and `tenant_id` is configured as a filter field.

### Verification or reset email never arrives

Check Render gateway logs, SMTP credentials, spam filtering, `EMAIL_FROM`, and
that `APP_BASE_URL` points to the final frontend origin.

### Browser shows a CORS error

Set `FRONTEND_ORIGIN` to the exact stable Vercel origin, including `https://`
and without a trailing path.

### Worker runs out of memory

Use a Render instance with at least 2 GB RAM. Repeatedly restarting the worker
on a 512 MB instance is not reliable.

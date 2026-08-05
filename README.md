# OmniQuery

OmniQuery is a production-shaped document intelligence workspace for small
teams. Users create accounts, upload private PDFs, wait for asynchronous
indexing, and ask questions grounded in their own source passages.

## What Is Built

- React/Vite frontend with sharp responsive dark and light themes
- Real JWT email/password accounts with bcrypt password hashing
- Email verification and one-time password reset links through generic SMTP
- MongoDB-persisted conversations scoped to the signed-in user
- Workspace document sharing with admin/member roles and invitations
- Private Supabase PDF storage with signed uploads
- QStash retries and signed webhooks for asynchronous processing
- Tenant-filtered MongoDB Atlas Vector Search retrieval
- Document deletion with storage cleanup, vector cleanup, and processing tombstones
- Groq answer generation with source passages
- JSON request logs, request IDs, Prometheus metrics, and health endpoints
- Browser E2E coverage, k6 load thresholds, production smoke checks, Dockerfiles
- CI on pull requests and conditional Render/Vercel CD after `master` or `main`

There are no demo credentials. Create a real account after the provider
environment variables are configured.

## Services

```text
frontend  React + Vite
gateway   Express API, auth, uploads, teams, conversations, metrics
ai-worker FastAPI, PDF parsing, embeddings, vector retrieval, Groq
MongoDB   users, conversations, invitations, document status, vectors
Supabase  private PDF object storage
QStash    signed asynchronous processing delivery
Groq      answer generation
```

## Local Requirements

- Node.js 20+
- Python 3.11 available as `py -3.11`
- A live MongoDB Atlas cluster with an active Atlas Vector Search index
- Supabase project and private `documents` bucket
- Groq API key
- QStash token and current/next signing keys
- SMTP credentials when `REQUIRE_EMAIL_VERIFICATION=true`

The old MongoDB hostname from the earlier local setup is no longer valid. Copy a
fresh SRV URI from the current Atlas cluster.

## First-Time Setup

```powershell
cd C:\Users\joynn\OneDrive\Desktop\main-project
Copy-Item gateway\.env.example gateway\.env
Copy-Item ai-worker\.env.example ai-worker\.env
Copy-Item frontend\.env.example frontend\.env

cd gateway
npm.cmd install

cd ..\frontend
npm.cmd install

cd ..\ai-worker
py -3.11 -m pip install -r requirements.txt
```

Fill the environment files. `gateway\.env` and `ai-worker\.env` must share:

- `MONGO_URI`
- `MONGO_DB`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET`
- `INTERNAL_API_KEY`

Use different long random values for `JWT_SECRET` and `METRICS_API_KEY`.
Generate secrets without printing any existing credentials:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

For a real beta, set `REQUIRE_EMAIL_VERIFICATION=true`, configure SMTP, and set
`APP_BASE_URL` to the exact frontend origin. Local development may leave
verification disabled until SMTP is ready.

## Start The Project

After the three `.env` files are filled, run this from the project root:

```powershell
.\scripts\start-dev.ps1
```

Open `http://127.0.0.1:5173`. The script starts the worker, gateway, and
frontend with hidden service windows and writes logs to `.logs`.

Stop them safely with:

```powershell
.\scripts\stop-dev.ps1
```

Manual startup, useful when watching live logs:

```powershell
# Terminal 1
cd C:\Users\joynn\OneDrive\Desktop\main-project\ai-worker
py -3.11 -m uvicorn app.main:app --reload --port 8000

# Terminal 2
cd C:\Users\joynn\OneDrive\Desktop\main-project\gateway
npm.cmd run dev

# Terminal 3
cd C:\Users\joynn\OneDrive\Desktop\main-project\frontend
npm.cmd run dev
```

Health checks:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8080/api/health
```

## Verification

```powershell
cd gateway
npm.cmd test
npm.cmd audit --audit-level=high

cd ..\ai-worker
py -3.11 -m unittest discover -s tests -v
py -3.11 -m compileall -q app tests
py -3.11 -m pip check

cd ..\frontend
npm.cmd run build
npm.cmd run test:e2e

cd ..
git diff --check
```

The browser test starts a mock gateway automatically and exercises registration,
upload, ready status, chat sources, document deletion, team invitation, and
theme switching. It does not create or use production accounts.

## Monitoring

- Gateway health: `/api/health`
- Worker health: `/health`
- Gateway Prometheus metrics: `/api/metrics` with `x-metrics-api-key`
- Worker Prometheus metrics: `/metrics` with `x-metrics-api-key`
- Every service response includes `X-Request-ID`

Use a real metrics secret in production. Do not expose either metrics endpoint
publicly without an authentication layer or private network policy.

## Load And Production Smoke

Install k6 through its official installer, then run the API thresholds against
a staging or mock target:

```powershell
k6 run -e BASE_URL=http://127.0.0.1:8089 load/k6-api.js
```

The production smoke script always checks frontend, gateway, and optional worker
health. Add a dedicated test account for authenticated checks:

```powershell
$env:FRONTEND_URL="https://your-frontend.example"
$env:GATEWAY_URL="https://your-gateway.example"
$env:WORKER_URL="https://your-worker.example"
$env:SMOKE_EMAIL="smoke@example.com"
$env:SMOKE_PASSWORD="a-long-test-password"
node scripts/smoke.mjs
```

Set `SMOKE_PDF_PATH` to run the full production upload, processing, chat, and
cleanup round trip.

## Deployment

Follow [DEPLOYMENT.md](./DEPLOYMENT.md) in order. The deployment uses:

1. MongoDB Atlas and an Atlas Vector Search index
2. Supabase Storage
3. Groq
4. Upstash QStash
5. SMTP
6. Render for the worker and gateway
7. Vercel for the frontend

GitHub Actions runs CI for pull requests and pushes. On a push to `master` or
`main`, CD runs only when the production environment contains all required
Render and Vercel secrets; otherwise it records a clean skip after CI passes.

## Security Notes

- Never commit `.env` files or provider keys.
- Keep the Supabase service-role key server-side only.
- Keep the storage bucket private.
- Protected requests resolve the current MongoDB tenant and role, so removal
  takes effect immediately even when an old JWT still exists in a browser.
- Email verification, reset, and invitation tokens are stored only as hashes.
- Rotate any key that has been pasted into a public issue, chat, or commit.

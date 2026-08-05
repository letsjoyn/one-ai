# Gateway

Express API for current-user JWT authentication, email verification, password
reset, workspace permissions, account-synced conversations, signed PDF uploads,
QStash delivery, deletion, structured logs, and Prometheus metrics.

```powershell
npm.cmd install
npm.cmd run dev
```

Production:

```powershell
npm.cmd start
```

Checks:

```powershell
npm.cmd test
npm.cmd audit --audit-level=high
```

Health is available at `/api/health`. Metrics are available at `/api/metrics`
when `x-metrics-api-key` matches `METRICS_API_KEY`.

See `..\DEPLOYMENT.md` for required environment variables.

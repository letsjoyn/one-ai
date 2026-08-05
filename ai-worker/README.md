# AI Worker

FastAPI worker for verified QStash jobs, PDF processing, tenant-scoped vector
indexing, deletion tombstones, document status, retrieval, Groq answer
generation, JSON logs, and Prometheus metrics.

```powershell
py -3.11 -m pip install -r requirements.txt
py -3.11 -m uvicorn app.main:app --reload --port 8000
```

Checks:

```powershell
py -3.11 -m unittest discover -s tests -v
py -3.11 -m compileall -q app tests
py -3.11 -m pip check
```

Health is available at `/health`. Metrics are available at `/metrics` when
`x-metrics-api-key` matches `METRICS_API_KEY`.

See `..\DEPLOYMENT.md` for provider setup and production environment variables.

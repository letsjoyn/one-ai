from contextlib import asynccontextmanager
import hmac
import time
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from starlette.responses import Response
from starlette.concurrency import run_in_threadpool

from app.api.chat_engine import router as chat_router
from app.api.documents import router as document_router
from app.api.webhook_receiver import router as webhook_router
from app.rag.mongo_vector import ensure_mongo_indexes
from app.core.config import get_settings
from app.core.monitoring import (
    HTTP_DURATION,
    HTTP_REQUESTS,
    configure_logging,
    request_id_context,
)

load_dotenv()
configure_logging(get_settings().log_level)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await run_in_threadpool(ensure_mongo_indexes)
    yield


app = FastAPI(title="OmniQuery AI Worker", version="1.0.0", lifespan=lifespan)


@app.middleware("http")
async def observe_requests(request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    token = request_id_context.set(request_id)
    started_at = time.perf_counter()
    response = None
    try:
        response = await call_next(request)
        return response
    finally:
        route = request.scope.get("route")
        route_path = getattr(route, "path", "unmatched")
        status = str(response.status_code if response else 500)
        labels = {
            "method": request.method,
            "route": route_path,
            "status": status,
        }
        HTTP_REQUESTS.labels(**labels).inc()
        HTTP_DURATION.labels(**labels).observe(time.perf_counter() - started_at)
        if response is not None:
            response.headers["X-Request-ID"] = request_id
        request_id_context.reset(token)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-worker"}


@app.get("/metrics")
def metrics(x_metrics_api_key: str | None = Header(default=None)):
    settings = get_settings()
    if not x_metrics_api_key or not hmac.compare_digest(
        x_metrics_api_key,
        settings.metrics_api_key,
    ):
        raise HTTPException(status_code=401, detail="Invalid metrics API key")
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


app.include_router(webhook_router)
app.include_router(chat_router)
app.include_router(document_router)

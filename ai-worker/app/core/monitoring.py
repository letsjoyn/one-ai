import json
import logging
from contextvars import ContextVar
from datetime import datetime, timezone

from prometheus_client import Counter, Histogram

request_id_context: ContextVar[str] = ContextVar("request_id", default="-")

HTTP_REQUESTS = Counter(
    "omniquery_worker_http_requests_total",
    "Total AI worker HTTP requests",
    ["method", "route", "status"],
)
HTTP_DURATION = Histogram(
    "omniquery_worker_http_request_duration_seconds",
    "AI worker HTTP request duration in seconds",
    ["method", "route", "status"],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 120, 300),
)
CHAT_REQUESTS = Counter(
    "omniquery_worker_chat_requests_total",
    "Total AI worker chat requests",
    ["result"],
)
CHAT_DURATION = Histogram(
    "omniquery_worker_chat_duration_seconds",
    "AI worker chat duration in seconds",
    ["result"],
    buckets=(0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120),
)
DOCUMENT_PROCESSING = Counter(
    "omniquery_worker_document_processing_total",
    "Total document processing jobs",
    ["result"],
)
DOCUMENT_PROCESSING_DURATION = Histogram(
    "omniquery_worker_document_processing_duration_seconds",
    "Document processing duration in seconds",
    ["result"],
    buckets=(0.5, 1, 2.5, 5, 10, 30, 60, 120, 300, 600),
)
DOCUMENT_DELETIONS = Counter(
    "omniquery_worker_document_deletions_total",
    "Total document deletion operations",
    ["result"],
)


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname.lower(),
            "service": "ai-worker",
            "logger": record.name,
            "requestId": request_id_context.get(),
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=True)


def configure_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level.upper())

    for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        uvicorn_logger = logging.getLogger(logger_name)
        uvicorn_logger.handlers = [handler]
        uvicorn_logger.propagate = False

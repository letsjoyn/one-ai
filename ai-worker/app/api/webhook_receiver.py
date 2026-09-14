import logging
import re
import traceback
import time
import uuid

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.core.security import get_qstash_receiver
from app.rag.document_processor import process_and_embed_file
from app.services.document_status_service import (
    claim_document_processing,
    ensure_document_status,
    get_document_status,
    is_document_deleted,
    upsert_document_status,
)
from app.core.monitoring import DOCUMENT_PROCESSING, DOCUMENT_PROCESSING_DURATION

router = APIRouter()
logger = logging.getLogger(__name__)

# Reject webhook bodies larger than 64 KB before reading them into memory.
MAX_WEBHOOK_BYTES = 64 * 1024

# Allowed MIME types for processing.
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/x-pdf",
    "text/plain",
    "text/markdown",
    "application/octet-stream",
}

_TENANT_PATH_RE = re.compile(r"^tenants/[a-zA-Z0-9_-]+/[a-zA-Z0-9_./-]+$")


class WebhookPayload(BaseModel):
    """Strict Pydantic model for webhook payloads — rejects unknown fields."""

    model_config = {"extra": "forbid"}

    filePath: str = Field(min_length=1, max_length=1024)
    userId: str = Field(min_length=1, max_length=100)
    documentId: str = Field(min_length=32, max_length=36)
    displayName: str | None = Field(default=None, max_length=512)
    mimeType: str | None = Field(default=None, max_length=128)

    @field_validator("documentId")
    @classmethod
    def validate_uuid(cls, v: str) -> str:
        try:
            uuid.UUID(v)
        except ValueError:
            raise ValueError("documentId must be a valid UUID")
        return v

    @field_validator("filePath")
    @classmethod
    def validate_file_path(cls, v: str) -> str:
        if not _TENANT_PATH_RE.match(v):
            raise ValueError("filePath has an invalid format")
        # Prevent path traversal
        if ".." in v:
            raise ValueError("filePath must not contain '..'")
        return v

    @field_validator("mimeType")
    @classmethod
    def validate_mime_type(cls, v: str | None) -> str | None:
        if v is not None and v.lower() not in ALLOWED_MIME_TYPES:
            raise ValueError(f"Unsupported mimeType: {v}")
        return v


def public_processing_error(exc: Exception) -> str:
    safe_messages = (
        "The PDF does not contain extractable text",
        "The document does not contain extractable text",
        "PDF exceeds the ",
        "Unsupported file type",
    )
    message = str(exc)
    if message.startswith(safe_messages):
        return message
    return "Document processing failed. Retry the upload or contact support."


def process_document_job(
    file_path: str,
    user_id: str,
    document_id: str,
    display_name: str | None = None,
    mime_type: str | None = None,
) -> str:
    started_at = time.perf_counter()
    try:
        result = process_and_embed_file(file_path, user_id, document_id, mime_type)
        if result.get("status") == "deleted":
            DOCUMENT_PROCESSING.labels(result="deleted").inc()
            DOCUMENT_PROCESSING_DURATION.labels(result="deleted").observe(
                time.perf_counter() - started_at
            )
            return "deleted"

        updated = upsert_document_status(
            document_id=document_id,
            user_id=user_id,
            file_path=file_path,
            status="ready",
            display_name=display_name,
            chunks=result.get("chunks"),
        )
        if not updated:
            if is_document_deleted(document_id=document_id, user_id=user_id):
                DOCUMENT_PROCESSING.labels(result="deleted").inc()
                DOCUMENT_PROCESSING_DURATION.labels(result="deleted").observe(
                    time.perf_counter() - started_at
                )
                return "deleted"
            raise RuntimeError("Document status disappeared during processing")

        DOCUMENT_PROCESSING.labels(result="success").inc()
        DOCUMENT_PROCESSING_DURATION.labels(result="success").observe(
            time.perf_counter() - started_at
        )
        return "ready"
    except Exception as exc:
        DOCUMENT_PROCESSING.labels(result="error").inc()
        DOCUMENT_PROCESSING_DURATION.labels(result="error").observe(
            time.perf_counter() - started_at
        )
        logger.error(
            "Document processing failed for %s: %s\n%s",
            document_id,
            exc,
            traceback.format_exc(),
        )
        if not is_document_deleted(document_id=document_id, user_id=user_id):
            upsert_document_status(
                document_id=document_id,
                user_id=user_id,
                file_path=file_path,
                status="failed",
                display_name=display_name,
                error=public_processing_error(exc),
            )
        raise


@router.post("/api/process-webhook")
async def process_document_webhook(request: Request):
    settings = get_settings()

    # ── Body-size guard: check Content-Length before reading body ──────────
    content_length_header = request.headers.get("content-length")
    if content_length_header:
        try:
            if int(content_length_header) > MAX_WEBHOOK_BYTES:
                raise HTTPException(status_code=413, detail="Request body too large")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid Content-Length header")

    body_bytes = await request.body()

    # Enforce limit even if Content-Length was absent or falsified
    if len(body_bytes) > MAX_WEBHOOK_BYTES:
        raise HTTPException(status_code=413, detail="Request body too large")

    # ── Signature verification ─────────────────────────────────────────────
    signature = request.headers.get("Upstash-Signature")
    local_bypass = (
        settings.env == "development"
        and request.headers.get("x-local-webhook-bypass") == "true"
        and request.client is not None
        and request.client.host in {"127.0.0.1", "::1"}
    )

    if not signature and not local_bypass:
        raise HTTPException(status_code=401, detail="Missing QStash signature")

    if not local_bypass:
        receiver = get_qstash_receiver()
        try:
            receiver.verify(body=body_bytes.decode("utf-8"), signature=signature)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=401, detail="Invalid QStash Signature") from exc

    # ── Payload validation via Pydantic ────────────────────────────────────
    import json
    try:
        raw = json.loads(body_bytes)
        payload = WebhookPayload.model_validate(raw)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {exc}") from exc

    # ── Ensure filePath belongs to the declared userId ─────────────────────
    expected_prefix = f"tenants/{payload.userId}/"
    if not payload.filePath.startswith(expected_prefix):
        raise HTTPException(status_code=403, detail="filePath does not belong to userId")

    existing = get_document_status(document_id=payload.documentId, user_id=payload.userId)
    if existing and existing.get("status") in {"ready", "deleted"}:
        return {
            "status": existing.get("status"),
            "file": payload.filePath,
            "documentId": payload.documentId,
        }

    ensure_document_status(
        document_id=payload.documentId,
        user_id=payload.userId,
        file_path=payload.filePath,
        display_name=payload.displayName,
    )
    claimed = claim_document_processing(
        document_id=payload.documentId,
        user_id=payload.userId,
        file_path=payload.filePath,
    )
    if not claimed:
        raise HTTPException(
            status_code=409,
            detail="Document is already being processed",
        )

    result_status = await run_in_threadpool(
        process_document_job,
        payload.filePath,
        payload.userId,
        payload.documentId,
        payload.displayName,
        payload.mimeType,
    )

    return {
        "status": result_status,
        "file": payload.filePath,
        "documentId": payload.documentId,
    }

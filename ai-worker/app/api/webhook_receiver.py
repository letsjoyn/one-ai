import logging
import traceback
import time

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.core.security import get_qstash_receiver
from app.rag.document_processor import process_and_embed_pdf
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


def public_processing_error(exc: Exception) -> str:
    safe_messages = (
        "The PDF does not contain extractable text",
        "PDF exceeds the ",
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
) -> str:
    started_at = time.perf_counter()
    try:
        result = process_and_embed_pdf(file_path, user_id, document_id)
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
    body_bytes = await request.body()
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

    payload = await request.json()
    file_path = payload.get("filePath")
    user_id = payload.get("userId")
    document_id = payload.get("documentId")
    display_name = payload.get("displayName")

    if not file_path or not user_id or not document_id:
        raise HTTPException(status_code=400, detail="Missing filePath, userId or documentId")

    existing = get_document_status(document_id=document_id, user_id=user_id)
    if existing and existing.get("status") in {"ready", "deleted"}:
        return {
            "status": existing.get("status"),
            "file": file_path,
            "documentId": document_id,
        }

    ensure_document_status(
        document_id=document_id,
        user_id=user_id,
        file_path=file_path,
        display_name=display_name,
    )
    claimed = claim_document_processing(
        document_id=document_id,
        user_id=user_id,
        file_path=file_path,
    )
    if not claimed:
        raise HTTPException(
            status_code=409,
            detail="Document is already being processed",
        )

    result_status = await run_in_threadpool(
        process_document_job,
        file_path,
        user_id,
        document_id,
        display_name,
    )

    return {
        "status": result_status,
        "file": file_path,
        "documentId": document_id,
    }

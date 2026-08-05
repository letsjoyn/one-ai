from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import require_internal_api_key
from app.rag.mongo_vector import delete_document_vectors
from app.services.document_status_service import (
    list_documents_for_user,
    mark_document_deleted,
)
from app.services.supabase_client import delete_file
from app.core.monitoring import DOCUMENT_DELETIONS

router = APIRouter()


def _serialize_datetime(value):
    if isinstance(value, datetime):
        return value.isoformat()
    return value


@router.get("/api/documents", dependencies=[Depends(require_internal_api_key)])
def get_documents(
    userId: str = Query(min_length=1, max_length=100),
    limit: int = Query(default=50, ge=1, le=200),
):
    try:
        docs = list_documents_for_user(user_id=userId, limit=limit)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Failed to read documents") from exc

    normalized = []
    for doc in docs:
        normalized.append({key: _serialize_datetime(val) for key, val in doc.items()})

    return {"documents": normalized}


@router.delete(
    "/api/documents/{document_id}",
    dependencies=[Depends(require_internal_api_key)],
)
def delete_document(
    document_id: str,
    userId: str = Query(min_length=1, max_length=100),
):
    try:
        document = mark_document_deleted(document_id=document_id, user_id=userId)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        deleted_chunks = delete_document_vectors(userId, document_id)
        if document.get("filePath"):
            delete_file(document["filePath"])
        DOCUMENT_DELETIONS.labels(result="success").inc()
    except HTTPException:
        DOCUMENT_DELETIONS.labels(result="not_found").inc()
        raise
    except Exception as exc:  # noqa: BLE001
        DOCUMENT_DELETIONS.labels(result="error").inc()
        raise HTTPException(status_code=500, detail="Document cleanup failed") from exc

    return {
        "status": "deleted",
        "documentId": document_id,
        "deletedChunks": deleted_chunks,
    }

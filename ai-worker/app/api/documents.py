from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from app.services.document_status_service import list_documents_for_user

router = APIRouter()


def _serialize_datetime(value):
    if isinstance(value, datetime):
        return value.isoformat()
    return value


@router.get("/api/documents")
def get_documents(userId: str = Query(min_length=1), limit: int = Query(default=50, ge=1, le=200)):
    try:
        docs = list_documents_for_user(user_id=userId, limit=limit)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Failed to read documents") from exc

    normalized = []
    for doc in docs:
        normalized.append({key: _serialize_datetime(val) for key, val in doc.items()})

    return {"documents": normalized}

from datetime import datetime, timezone

from app.rag.mongo_vector import get_document_status_collection


def _now() -> datetime:
    return datetime.now(timezone.utc)


def upsert_document_status(
    *,
    document_id: str,
    user_id: str,
    file_path: str,
    status: str,
    chunks: int | None = None,
    error: str | None = None,
) -> None:
    collection = get_document_status_collection()

    update = {
        "$set": {
            "userId": user_id,
            "filePath": file_path,
            "status": status,
            "updatedAt": _now(),
            "error": error,
        },
        "$setOnInsert": {"documentId": document_id, "createdAt": _now()},
    }

    if chunks is not None:
        update["$set"]["chunks"] = chunks

    collection.update_one({"documentId": document_id}, update, upsert=True)


def list_documents_for_user(user_id: str, limit: int = 100):
    collection = get_document_status_collection()
    cursor = collection.find({"userId": user_id}, {"_id": 0}).sort("updatedAt", -1).limit(limit)
    return list(cursor)

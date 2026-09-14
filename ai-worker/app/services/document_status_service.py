from datetime import datetime, timedelta, timezone

from pymongo import ReturnDocument

from app.rag.mongo_vector import get_document_status_collection


def _now() -> datetime:
    return datetime.now(timezone.utc)


def upsert_document_status(
    *,
    document_id: str,
    user_id: str,
    file_path: str,
    status: str,
    display_name: str | None = None,
    chunks: int | None = None,
    error: str | None = None,
) -> bool:
    collection = get_document_status_collection()

    update = {
        "$set": {
            "userId": user_id,
            "filePath": file_path,
            "status": status,
            "updatedAt": _now(),
            "error": error,
        },
        "$unset": {"leaseExpiresAt": ""},
    }

    if chunks is not None:
        update["$set"]["chunks"] = chunks
    if display_name:
        update["$set"]["displayName"] = display_name

    result = collection.update_one(
        {
            "documentId": document_id,
            "userId": user_id,
            "status": {"$ne": "deleted"},
        },
        update,
        upsert=False,
    )
    return bool(result.matched_count)


def get_document_status(*, document_id: str, user_id: str):
    collection = get_document_status_collection()
    return collection.find_one(
        {"documentId": document_id, "userId": user_id},
        {"_id": 0},
    )


def ensure_document_status(
    *,
    document_id: str,
    user_id: str,
    file_path: str,
    display_name: str | None = None,
) -> None:
    collection = get_document_status_collection()
    now = _now()
    collection.update_one(
        {"documentId": document_id, "userId": user_id},
        {
            "$setOnInsert": {
                "documentId": document_id,
                "userId": user_id,
                "filePath": file_path,
                "displayName": display_name,
                "status": "queued",
                "createdAt": now,
                "updatedAt": now,
                "error": None,
            }
        },
        upsert=True,
    )


def claim_document_processing(
    *,
    document_id: str,
    user_id: str,
    file_path: str,
    lease_minutes: int = 20,
):
    collection = get_document_status_collection()
    now = _now()
    return collection.find_one_and_update(
        {
            "documentId": document_id,
            "userId": user_id,
            "status": {"$nin": ["ready", "deleted"]},
            "$or": [
                {"status": {"$ne": "processing"}},
                {"leaseExpiresAt": {"$lte": now}},
                {"leaseExpiresAt": {"$exists": False}},
            ],
        },
        {
            "$set": {
                "filePath": file_path,
                "status": "processing",
                "updatedAt": now,
                "leaseExpiresAt": now + timedelta(minutes=lease_minutes),
                "error": None,
            }
        },
        return_document=ReturnDocument.AFTER,
    )


def list_documents_for_user(user_id: str, limit: int = 500):
    collection = get_document_status_collection()
    cursor = (
        collection.find(
            {"userId": user_id, "status": {"$ne": "deleted"}},
            {"_id": 0},
        )
        .sort("updatedAt", -1)
        .limit(limit)
    )
    return list(cursor)


def mark_document_deleted(*, document_id: str, user_id: str):
    collection = get_document_status_collection()
    return collection.find_one_and_update(
        {
            "documentId": document_id,
            "userId": user_id,
        },
        {
            "$set": {
                "status": "deleted",
                "updatedAt": _now(),
                "error": None,
            },
            "$unset": {"leaseExpiresAt": ""},
        },
        projection={"_id": 0},
        return_document=ReturnDocument.AFTER,
    )


def mark_all_documents_deleted(*, user_id: str) -> int:
    collection = get_document_status_collection()
    res = collection.update_many(
        {
            "userId": user_id,
            "status": {"$ne": "deleted"},
        },
        {
            "$set": {
                "status": "deleted",
                "updatedAt": _now(),
                "error": None,
            },
            "$unset": {"leaseExpiresAt": ""},
        },
    )
    return res.modified_count


def is_document_deleted(*, document_id: str, user_id: str) -> bool:
    collection = get_document_status_collection()
    return (
        collection.count_documents(
            {
                "documentId": document_id,
                "userId": user_id,
                "status": "deleted",
            },
            limit=1,
        )
        > 0
    )

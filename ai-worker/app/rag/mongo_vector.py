from functools import lru_cache

import certifi
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_mongodb import MongoDBAtlasVectorSearch
from pymongo import MongoClient
from pymongo.operations import SearchIndexModel

from app.core.config import get_settings


@lru_cache
def get_embeddings() -> HuggingFaceEmbeddings:
    return HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")


@lru_cache
def get_mongo_client() -> MongoClient:
    settings = get_settings()
    return MongoClient(
        settings.mongo_uri,
        serverSelectionTimeoutMS=settings.mongo_server_selection_timeout_ms,
        tlsCAFile=certifi.where(),
    )


@lru_cache
def get_collection():
    settings = get_settings()
    return get_mongo_client()[settings.mongo_db][settings.mongo_collection]


@lru_cache
def get_document_status_collection():
    settings = get_settings()
    return get_mongo_client()[settings.mongo_db]["document_status"]


def ensure_mongo_indexes() -> None:
    settings = get_settings()
    get_mongo_client().admin.command("ping")

    get_document_status_collection().create_index(
        [("documentId", 1), ("userId", 1)],
        unique=True,
        name="document_user_unique",
    )
    get_document_status_collection().create_index(
        [("userId", 1), ("updatedAt", -1)],
        name="user_updated_at",
    )
    get_collection().create_index(
        [("tenant_id", 1), ("document_id", 1)],
        name="tenant_document",
    )

    import logging as _logging
    _vi_logger = _logging.getLogger(__name__)

    try:
        existing = {idx["name"] for idx in get_collection().list_search_indexes()}
        if settings.mongo_vector_index not in existing:
            model = SearchIndexModel(
                definition={
                    "fields": [
                        {
                            "type": "vector",
                            "path": "embedding",
                            "numDimensions": 384,
                            "similarity": "cosine",
                        },
                        {
                            "type": "filter",
                            "path": "tenant_id",
                        },
                    ]
                },
                name=settings.mongo_vector_index,
                type="vectorSearch",
            )
            get_collection().create_search_index(model=model)
            _vi_logger.info("Vector search index '%s' created.", settings.mongo_vector_index)
        else:
            _vi_logger.debug("Vector search index '%s' already exists.", settings.mongo_vector_index)
    except Exception as _vi_exc:  # noqa: BLE001
        error_msg = str(_vi_exc).lower()
        # Atlas returns an error when the index already exists — that is safe to ignore.
        if "already exists" in error_msg or "duplicate" in error_msg:
            _vi_logger.debug("Vector search index already exists (confirmed by error message).")
        else:
            # A real failure — log prominently so it is visible in health checks.
            _vi_logger.error(
                "Failed to create vector search index '%s': %s — "
                "vector similarity search may not work until this is resolved.",
                settings.mongo_vector_index,
                _vi_exc,
            )



def get_vector_store() -> MongoDBAtlasVectorSearch:
    settings = get_settings()
    return MongoDBAtlasVectorSearch(
        embedding=get_embeddings(),
        collection=get_collection(),
        index_name=settings.mongo_vector_index,
        relevance_score_fn="cosine",
    )


def delete_document_vectors(tenant_id: str, document_id: str) -> int:
    result = get_collection().delete_many(
        {
            "tenant_id": tenant_id,
            "document_id": document_id,
        }
    )
    return result.deleted_count

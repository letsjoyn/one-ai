from functools import lru_cache

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_mongodb import MongoDBAtlasVectorSearch
from pymongo import MongoClient

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

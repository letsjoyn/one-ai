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
    return MongoClient(settings.mongo_uri)


@lru_cache
def get_collection():
    settings = get_settings()
    return get_mongo_client()[settings.mongo_db][settings.mongo_collection]


@lru_cache
def get_document_status_collection():
    settings = get_settings()
    return get_mongo_client()[settings.mongo_db]["document_status"]


def get_vector_store() -> MongoDBAtlasVectorSearch:
    settings = get_settings()
    return MongoDBAtlasVectorSearch(
        embedding=get_embeddings(),
        collection=get_collection(),
        index_name=settings.mongo_vector_index,
        relevance_score_fn="cosine",
    )

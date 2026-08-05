import os

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import get_settings
from app.rag.mongo_vector import delete_document_vectors, get_collection, get_vector_store
from app.services.document_status_service import is_document_deleted
from app.services.supabase_client import download_pdf_to_tempfile


def process_and_embed_pdf(file_path: str, tenant_id: str, document_id: str) -> dict:
    settings = get_settings()
    if is_document_deleted(document_id=document_id, user_id=tenant_id):
        return {
            "status": "deleted",
            "chunks": 0,
            "tenant_id": tenant_id,
            "document_id": document_id,
        }

    local_pdf_path = download_pdf_to_tempfile(file_path)

    try:
        loader = PyPDFLoader(local_pdf_path)
        docs = loader.load()
        if not docs:
            raise ValueError("The PDF does not contain extractable text")
        if len(docs) > settings.max_pdf_pages:
            raise ValueError(f"PDF exceeds the {settings.max_pdf_pages}-page processing limit")

        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
        chunks = splitter.split_documents(docs)

        for i, chunk in enumerate(chunks):
            chunk.metadata["tenant_id"] = tenant_id
            chunk.metadata["document_id"] = document_id
            chunk.metadata["source_path"] = file_path
            chunk.metadata["chunk_number"] = i + 1

        collection = get_collection()
        collection.delete_many({
            "tenant_id": tenant_id,
            "document_id": document_id,
        })

        vector_store = get_vector_store()
        vector_store.add_documents(chunks)

        if is_document_deleted(document_id=document_id, user_id=tenant_id):
            delete_document_vectors(tenant_id, document_id)
            return {
                "status": "deleted",
                "chunks": 0,
                "tenant_id": tenant_id,
                "document_id": document_id,
            }

        return {
            "status": "success",
            "chunks": len(chunks),
            "tenant_id": tenant_id,
            "document_id": document_id,
        }
    finally:
        if os.path.exists(local_pdf_path):
            os.remove(local_pdf_path)

import os
from pathlib import Path

from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import get_settings
from app.rag.mongo_vector import delete_document_vectors, get_collection, get_vector_store
from app.services.document_status_service import is_document_deleted
from app.services.supabase_client import download_file_to_tempfile


TEXT_EXTENSIONS = {".txt", ".md", ".markdown"}


def _load_text_document(local_path: str, file_path: str) -> list[Document]:
    path = Path(local_path)
    try:
        text = path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        text = path.read_text(encoding="utf-8", errors="replace")

    if not text.strip():
        raise ValueError("The document does not contain extractable text")

    return [Document(page_content=text, metadata={"source": file_path})]


def _load_documents(local_path: str, file_path: str, mime_type: str | None) -> list[Document]:
    extension = Path(file_path).suffix.lower()
    normalized_mime = (mime_type or "").lower()

    if extension == ".pdf" or normalized_mime in {"application/pdf", "application/x-pdf"}:
        return PyPDFLoader(local_path).load()

    if extension in TEXT_EXTENSIONS or normalized_mime in {"text/plain", "text/markdown"}:
        return _load_text_document(local_path, file_path)

    raise ValueError("Unsupported file type")


def process_and_embed_file(
    file_path: str,
    tenant_id: str,
    document_id: str,
    mime_type: str | None = None,
) -> dict:
    settings = get_settings()
    if is_document_deleted(document_id=document_id, user_id=tenant_id):
        return {
            "status": "deleted",
            "chunks": 0,
            "tenant_id": tenant_id,
            "document_id": document_id,
        }

    local_file_path = download_file_to_tempfile(file_path)

    try:
        docs = _load_documents(local_file_path, file_path, mime_type)
        if not docs:
            raise ValueError("The document does not contain extractable text")
        if Path(file_path).suffix.lower() == ".pdf" and len(docs) > settings.max_pdf_pages:
            raise ValueError(f"PDF exceeds the {settings.max_pdf_pages}-page processing limit")

        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
        chunks = splitter.split_documents(docs)
        if not chunks:
            raise ValueError("The document does not contain extractable text")

        for i, chunk in enumerate(chunks):
            chunk.metadata["tenant_id"] = tenant_id
            chunk.metadata["document_id"] = document_id
            chunk.metadata["source_path"] = file_path
            chunk.metadata["file_type"] = Path(file_path).suffix.lower().lstrip(".") or "unknown"
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
        if os.path.exists(local_file_path):
            os.remove(local_file_path)

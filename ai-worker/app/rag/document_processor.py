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

# Hard limits to prevent resource exhaustion from large/malicious files.
MAX_TEXT_CHARS = 2_000_000   # ~2 MB of extracted text
MAX_CHUNKS = 2_000           # maximum vector embeddings per document


def _load_text_document(local_path: str, file_path: str) -> list[Document]:
    path = Path(local_path)
    try:
        text = path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        text = path.read_text(encoding="utf-8", errors="replace")

    if not text.strip():
        raise ValueError("The document does not contain extractable text")

    # Enforce character limit before chunking
    if len(text) > MAX_TEXT_CHARS:
        raise ValueError(
            f"Document exceeds the {MAX_TEXT_CHARS // 1_000_000} MB text-extraction limit"
        )

    return [Document(page_content=text, metadata={"source": file_path})]


def _count_pdf_pages(local_path: str) -> int:
    """Return page count without extracting text — fast pre-flight check."""
    try:
        import pypdf
        with open(local_path, "rb") as f:
            reader = pypdf.PdfReader(f, strict=False)
            return len(reader.pages)
    except Exception:
        return 0  # Fall through; full loader will surface any real error.


def _load_documents(local_path: str, file_path: str, mime_type: str | None) -> list[Document]:
    settings = get_settings()
    extension = Path(file_path).suffix.lower()
    normalized_mime = (mime_type or "").lower()

    if extension == ".pdf" or normalized_mime in {"application/pdf", "application/x-pdf"}:
        # Check page count BEFORE loading all text into memory (#17)
        page_count = _count_pdf_pages(local_path)
        if page_count > settings.max_pdf_pages:
            raise ValueError(
                f"PDF exceeds the {settings.max_pdf_pages}-page processing limit"
            )
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

        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
        chunks = splitter.split_documents(docs)
        if not chunks:
            raise ValueError("The document does not contain extractable text")

        # Enforce chunk limit to prevent unbounded embedding/DB writes (#18)
        if len(chunks) > MAX_CHUNKS:
            raise ValueError(
                f"Document produced {len(chunks)} chunks which exceeds the "
                f"{MAX_CHUNKS}-chunk processing limit. Split it into smaller files."
            )

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

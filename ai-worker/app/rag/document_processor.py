import os

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.rag.mongo_vector import get_vector_store
from app.services.supabase_client import download_pdf_to_tempfile


def process_and_embed_pdf(file_path: str, tenant_id: str, document_id: str) -> dict:
    local_pdf_path = download_pdf_to_tempfile(file_path)

    try:
        loader = PyPDFLoader(local_pdf_path)
        docs = loader.load()

        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
        chunks = splitter.split_documents(docs)

        for i, chunk in enumerate(chunks):
            chunk.metadata["tenant_id"] = tenant_id
            chunk.metadata["document_id"] = document_id
            chunk.metadata["source_path"] = file_path
            chunk.metadata["chunk_number"] = i + 1

        vector_store = get_vector_store()
        vector_store.add_documents(chunks)

        return {
            "status": "success",
            "chunks": len(chunks),
            "tenant_id": tenant_id,
            "document_id": document_id,
        }
    finally:
        if os.path.exists(local_pdf_path):
            os.remove(local_pdf_path)

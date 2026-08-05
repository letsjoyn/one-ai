from groq import Groq

from app.core.config import get_settings
from app.rag.mongo_vector import get_vector_store


def _format_context(docs) -> str:
    sections = []
    for idx, doc in enumerate(docs, start=1):
        source = doc.metadata.get("source_path", "unknown")
        chunk = doc.metadata.get("chunk_number", "?")
        sections.append(f"[{idx}] Source={source} chunk={chunk}\n{doc.page_content}")
    return "\n\n".join(sections)


def build_rag_answer(user_id: str, query: str, top_k: int = 4) -> dict:
    settings = get_settings()
    vector_store = get_vector_store()

    docs = vector_store.similarity_search(
        query,
        k=top_k,
        pre_filter={"tenant_id": {"$eq": user_id}},
    )

    context_text = _format_context(docs)

    system_prompt = (
        "You are OmniQuery AI. Answer only with provided context. "
        "If context is insufficient, say what is missing."
    )

    user_prompt = (
        f"Question: {query}\n\n"
        "Context passages:\n"
        f"{context_text}\n\n"
        "Return a concise answer and reference source ids like [1], [2]."
    )

    client = Groq(api_key=settings.groq_api_key)
    completion = client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
    )

    answer = completion.choices[0].message.content or "No answer generated."

    sources = [
        {
            "sourcePath": doc.metadata.get("source_path"),
            "chunk": doc.metadata.get("chunk_number"),
            "documentId": doc.metadata.get("document_id"),
            "snippet": (doc.page_content[:300] + "...") if len(doc.page_content) > 300 else doc.page_content,
        }
        for doc in docs
    ]

    return {"answer": answer, "sources": sources}

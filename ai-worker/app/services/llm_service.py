from groq import Groq

from app.core.config import get_settings
from app.rag.mongo_vector import get_vector_store


def _deduplicate_by_document(docs):
    """
    Keep only the best (first) chunk per unique document_id.
    This ensures every resume is represented, not just the same
    document repeated across multiple chunks.
    """
    seen = set()
    unique = []
    for doc in docs:
        doc_id = doc.metadata.get("document_id") or doc.metadata.get("source_path")
        if doc_id not in seen:
            seen.add(doc_id)
            unique.append(doc)
    return unique


def _format_context(docs) -> str:
    sections = []
    for idx, doc in enumerate(docs, start=1):
        source = doc.metadata.get("source_path", "unknown")
        chunk = doc.metadata.get("chunk_number", "?")
        sections.append(f"[{idx}] Source: {source} (chunk {chunk})\n{doc.page_content}")
    return "\n\n---\n\n".join(sections)


def build_rag_answer(user_id: str, query: str, top_k: int = 30) -> dict:
    settings = get_settings()
    vector_store = get_vector_store()

    # Retrieve a generous pool, then deduplicate so every document gets one slot
    docs = vector_store.similarity_search(
        query,
        k=top_k,
        pre_filter={"tenant_id": user_id},
    )

    # One representative chunk per unique document
    docs = _deduplicate_by_document(docs)

    context_text = _format_context(docs)

    system_prompt = (
        "You are OmniQuery AI, an expert document analyst. "
        "Answer questions using ONLY the provided context passages. "
        "When ranking or comparing documents (e.g. resumes), evaluate ALL documents "
        "present in the context and produce a well-formatted, structured answer. "
        "Use markdown tables and bullet lists where they help clarity. "
        "If context is insufficient, clearly say what is missing. "
        "Never reference information outside the provided context."
    )

    user_prompt = (
        f"Question: {query}\n\n"
        f"Context passages ({len(docs)} documents):\n\n"
        f"{context_text}\n\n"
        "Instructions:\n"
        "- Answer the question using ALL relevant documents from the context above.\n"
        "- Reference documents by their [N] index number.\n"
        "- Use a markdown table for comparisons or rankings.\n"
        "- Be thorough — do not skip documents if the question asks to compare all."
    )

    client = Groq(api_key=settings.groq_api_key)
    completion = client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
        max_tokens=4096,
    )

    answer = completion.choices[0].message.content or "No answer generated."

    sources = [
        {
            "sourcePath": doc.metadata.get("source_path"),
            "chunk": doc.metadata.get("chunk_number"),
            "documentId": doc.metadata.get("document_id"),
            "snippet": (doc.page_content[:300] + "…") if len(doc.page_content) > 300 else doc.page_content,
        }
        for doc in docs
    ]

    return {"answer": answer, "sources": sources}

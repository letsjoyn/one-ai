from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
import time

from app.core.monitoring import CHAT_DURATION, CHAT_REQUESTS
from app.core.security import require_internal_api_key
from app.services.llm_service import build_rag_answer

router = APIRouter()


class ChatRequest(BaseModel):
    userId: str = Field(min_length=1, max_length=100)
    query: str = Field(min_length=1, max_length=5000)
    conversationId: str | None = Field(default=None, max_length=100)
    topK: int = Field(default=30, ge=1, le=50)


@router.post("/api/chat", dependencies=[Depends(require_internal_api_key)])
def chat_with_rag(payload: ChatRequest):
    started_at = time.perf_counter()
    try:
        result = build_rag_answer(user_id=payload.userId, query=payload.query, top_k=payload.topK)
        CHAT_REQUESTS.labels(result="success").inc()
        CHAT_DURATION.labels(result="success").observe(time.perf_counter() - started_at)
        return {
            "answer": result["answer"],
            "sources": result["sources"],
        }
    except Exception:
        CHAT_REQUESTS.labels(result="error").inc()
        CHAT_DURATION.labels(result="error").observe(time.perf_counter() - started_at)
        raise

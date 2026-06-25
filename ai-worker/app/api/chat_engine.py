from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.llm_service import build_rag_answer

router = APIRouter()


class ChatRequest(BaseModel):
    userId: str = Field(min_length=1)
    query: str = Field(min_length=1)
    conversationId: str | None = None
    topK: int = Field(default=4, ge=1, le=10)


@router.post("/api/chat")
def chat_with_rag(payload: ChatRequest):
    result = build_rag_answer(user_id=payload.userId, query=payload.query, top_k=payload.topK)
    return {
        "answer": result["answer"],
        "sources": result["sources"],
    }

import os
from dotenv import load_dotenv
from fastapi import FastAPI

from app.api.chat_engine import router as chat_router
from app.api.documents import router as document_router
from app.api.webhook_receiver import router as webhook_router

load_dotenv()

app = FastAPI(title="OmniQuery AI Worker", version="1.0.0")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-worker"}


app.include_router(webhook_router)
app.include_router(chat_router)
app.include_router(document_router)

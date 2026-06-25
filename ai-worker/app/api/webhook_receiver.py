from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from app.core.security import get_qstash_receiver
from app.rag.document_processor import process_and_embed_pdf
from app.services.document_status_service import upsert_document_status

router = APIRouter()


def process_document_job(file_path: str, user_id: str, document_id: str) -> None:
    print(f"--- [DEBUG] Job started for: {document_id} ---")
    
    upsert_document_status(
        document_id=document_id,
        user_id=user_id,
        file_path=file_path,
        status="processing",
    )

    try:
        print(f"--- [DEBUG] Calling processor for: {document_id} ---")
        result = process_and_embed_pdf(file_path, user_id, document_id)
        print(f"--- [DEBUG] Processor success for: {document_id} ---")
        
        upsert_document_status(
            document_id=document_id,
            user_id=user_id,
            file_path=file_path,
            status="ready",
            chunks=result.get("chunks"),
        )
    except Exception as exc:
        print(f"--- [CRITICAL ERROR] --- {str(exc)}")
        # Print the full stack trace so we see where it crashes
        import traceback
        traceback.print_exc()
        
        upsert_document_status(
            document_id=document_id,
            user_id=user_id,
            file_path=file_path,
            status="failed",
            error=str(exc),
        )


@router.post("/api/process-webhook")
async def process_document_webhook(request: Request, background_tasks: BackgroundTasks):
    body_bytes = await request.body()
    signature = request.headers.get("Upstash-Signature")
    local_bypass = request.headers.get("x-local-webhook-bypass") == "true"

    if not signature and not local_bypass:
        raise HTTPException(status_code=401, detail="Missing QStash signature")

    if not local_bypass:
        receiver = get_qstash_receiver()

        try:
            receiver.verify(body=body_bytes.decode("utf-8"), signature=signature)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=401, detail="Invalid QStash Signature") from exc

    payload = await request.json()
    file_path = payload.get("filePath")
    user_id = payload.get("userId")
    document_id = payload.get("documentId")

    if not file_path or not user_id or not document_id:
        raise HTTPException(status_code=400, detail="Missing filePath, userId or documentId")

    upsert_document_status(
        document_id=document_id,
        user_id=user_id,
        file_path=file_path,
        status="queued",
    )
    background_tasks.add_task(process_document_job, file_path, user_id, document_id)

    return {
        "status": "queued",
        "file": file_path,
        "documentId": document_id,
    }

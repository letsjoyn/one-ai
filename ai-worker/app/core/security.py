import hmac

from fastapi import Header, HTTPException
from qstash import Receiver

from app.core.config import get_settings


def get_qstash_receiver() -> Receiver:
    settings = get_settings()
    return Receiver(
        current_signing_key=settings.qstash_current_signing_key,
        next_signing_key=settings.qstash_next_signing_key,
    )


def require_internal_api_key(x_internal_api_key: str | None = Header(default=None)) -> None:
    settings = get_settings()
    if not x_internal_api_key or not hmac.compare_digest(x_internal_api_key, settings.internal_api_key):
        raise HTTPException(status_code=401, detail="Invalid internal API key")

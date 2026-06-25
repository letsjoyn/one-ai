from qstash import Receiver

from app.core.config import get_settings


def get_qstash_receiver() -> Receiver:
    settings = get_settings()
    return Receiver(
        current_signing_key=settings.qstash_current_signing_key,
        next_signing_key=settings.qstash_next_signing_key,
    )

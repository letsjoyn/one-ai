import os
from pathlib import Path
import tempfile
from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings


@lru_cache
def get_supabase_client() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def download_file_to_tempfile(file_path: str) -> str:
    settings = get_settings()
    supabase = get_supabase_client()
    data = supabase.storage.from_(settings.supabase_bucket).download(file_path)

    suffix = Path(file_path).suffix or ".bin"
    fd, temp_path = tempfile.mkstemp(prefix="omniquery-", suffix=suffix)
    with os.fdopen(fd, "wb") as tmp:
        tmp.write(data)

    return temp_path


def delete_file(file_path: str) -> None:
    settings = get_settings()
    supabase = get_supabase_client()
    supabase.storage.from_(settings.supabase_bucket).remove([file_path])

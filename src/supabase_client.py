"""Supabase client helpers for GEO Content Automation."""

from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()


class SupabaseConfigError(RuntimeError):
    """Raised when required Supabase environment variables are missing."""


def _require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise SupabaseConfigError(
            f"Missing required environment variable: {name}. "
            "Copy .env.example to .env and add your Supabase credentials."
        )
    return value


@lru_cache(maxsize=1)
def get_supabase_client(*, use_service_role: bool = False) -> Client:
    """
    Create a cached Supabase client.

    Uses the anon key by default. Pass use_service_role=True only for
    trusted server-side operations that need elevated privileges.
    """
    url = _require_env("SUPABASE_URL")
    if use_service_role:
        key = _require_env("SUPABASE_SERVICE_ROLE_KEY")
    else:
        key = _require_env("SUPABASE_ANON_KEY")
    return create_client(url, key)


def ping_supabase() -> dict:
    """
    Verify credentials and network reachability.

    Uses the Auth settings endpoint, which does not require a database table.
    """
    client = get_supabase_client()
    response = client.auth.get_settings()
    return {
        "ok": True,
        "url": os.getenv("SUPABASE_URL"),
        "auth_settings_available": response is not None,
    }

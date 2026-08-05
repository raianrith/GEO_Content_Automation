#!/usr/bin/env python3
"""Verify that Supabase credentials are configured and reachable."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.supabase_client import SupabaseConfigError, ping_supabase


def main() -> int:
    try:
        result = ping_supabase()
    except SupabaseConfigError as exc:
        print(f"Config error: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001 - surface connection failures clearly
        print(f"Connection failed: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(result, indent=2))
    print("Supabase connection OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

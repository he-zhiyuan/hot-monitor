"""Shared CLI helpers (UTF-8 stdout, JSON output)."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


def configure_stdout_utf8() -> None:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            try:
                stream.reconfigure(encoding="utf-8")
            except Exception:
                pass


def write_json_output(payload: dict[str, Any], out_path: str | None) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if out_path:
        Path(out_path).write_text(text, encoding="utf-8")
        print(f"Wrote {out_path}", file=sys.stderr)
    else:
        print(text)


def skill_root() -> Path:
    return Path(__file__).resolve().parents[2]

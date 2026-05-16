"""Shared item helpers for JSON CLI output."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def parse_date(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, (int, float)):
        ts = value / 1000 if value > 1e12 else value
        return datetime.fromtimestamp(ts, tz=timezone.utc)
    try:
        s = str(value).replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None


def item_to_dict(item: dict[str, Any]) -> dict[str, Any]:
    pub = item.get("publishedAt")
    if isinstance(pub, datetime):
        pub_str = pub.astimezone(timezone.utc).isoformat()
    else:
        pub_str = None
    out: dict[str, Any] = {
        "title": item.get("title", ""),
        "url": item.get("url", ""),
        "content": item.get("content", ""),
        "author": item.get("author", ""),
        "publishedAt": pub_str,
        "source": item.get("source", ""),
    }
    for key in ("likes", "comments", "shares", "views", "localPass", "dateLabel"):
        if item.get(key) is not None:
            out[key] = item[key]
    return out

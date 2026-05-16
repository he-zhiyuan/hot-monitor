"""Sort and pre-filter search results."""
from __future__ import annotations

import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

_SKILL_ROOT = Path(__file__).resolve().parents[2]
if str(_SKILL_ROOT) not in sys.path:
    sys.path.insert(0, str(_SKILL_ROOT))

from rules.keyword_match import local_relevance_match  # noqa: E402

SOURCE_WEIGHT: dict[str, int] = {
    "hackernews": 90,
    "googlenews": 85,
    "reddit": 80,
    "devto": 75,
    "bilibili": 85,
    "36kr": 80,
    "sspai": 75,
    "github": 70,
    "web": 45,
    "baidu": 25,
    "codefather": 95,
    "ai_nav": 95,
}

BAIDU_NOISE = re.compile(
    r"翻译|词典|百度百科|百度图片|个人空间|个人主页|知乎|抖音|CSDN|Gitee",
    re.I,
)


def _pub_date(item: dict[str, Any]) -> date | None:
    pub = item.get("publishedAt")
    if not isinstance(pub, datetime):
        return None
    return pub.astimezone(timezone.utc).date()


def filter_today_only(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    today = datetime.now(timezone.utc).date()
    out: list[dict[str, Any]] = []
    for item in items:
        rel = item.get("relativeDate") or ""
        label = str(item.get("dateLabel") or "")
        if rel == "today" or "今天" in label:
            out.append(item)
            continue
        d = _pub_date(item)
        if d == today:
            out.append(item)
    return out


def is_low_quality(item: dict[str, Any], keyword: str) -> bool:
    source = str(item.get("source") or "")
    title = str(item.get("title") or "")
    content = str(item.get("content") or "")
    url = str(item.get("url") or "")

    if source == "baidu":
        if BAIDU_NOISE.search(title):
            return True
        if "baidu.com/link" in url and len(content) < 30:
            return True

    if source in ("baidu", "web") and not local_relevance_match(
        keyword, title, content, None
    ):
        return True

    return False


def engagement_bonus(item: dict[str, Any]) -> int:
    likes = int(item.get("likes") or 0)
    comments = int(item.get("comments") or 0)
    views = int(item.get("views") or 0)
    return min(30, likes // 10 + comments // 5 + views // 100_000)


def sort_items(items: list[dict[str, Any]], keyword: str) -> list[dict[str, Any]]:
    scored: list[tuple[int, dict[str, Any]]] = []
    for item in items:
        if is_low_quality(item, keyword):
            continue
        src = str(item.get("source") or "")
        base = SOURCE_WEIGHT.get(src, 50)
        bonus = engagement_bonus(item)
        pub = item.get("publishedAt")
        recency = 0
        if isinstance(pub, datetime):
            hours = (datetime.now(timezone.utc) - pub).total_seconds() / 3600
            if hours < 6:
                recency = 15
            elif hours < 24:
                recency = 10
            elif hours < 48:
                recency = 5
        scored.append((base + bonus + recency, item))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in scored]


def apply_prefilter(
    items: list[dict[str, Any]], keyword: str, expansion_json: str
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for item in items:
        passed = local_relevance_match(
            keyword,
            str(item.get("title") or ""),
            str(item.get("content") or ""),
            expansion_json,
        )
        item = dict(item)
        item["localPass"] = passed
        if passed:
            out.append(item)
    return out


def annotate_prefilter(
    items: list[dict[str, Any]], keyword: str, expansion_json: str
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for item in items:
        item = dict(item)
        item["localPass"] = local_relevance_match(
            keyword,
            str(item.get("title") or ""),
            str(item.get("content") or ""),
            expansion_json,
        )
        out.append(item)
    return out

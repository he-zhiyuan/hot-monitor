"""Multi-source aggregation (aligned with server/src/lib/sources/index.ts)."""
from __future__ import annotations

import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable

from . import (
    baidu,
    bilibili,
    devto,
    github,
    googlenews,
    hackernews,
    reddit,
    technews,
    websearch,
)

SourceFn = Callable[[], list[dict[str, Any]]]

# CLI --sources keys → internal labels
SOURCE_ALIASES: dict[str, str] = {
    "hn": "HN",
    "hackernews": "HN",
    "github": "GitHub",
    "bing": "Bing",
    "web": "Bing",
    "googlenews": "GoogleNews",
    "gnews": "GoogleNews",
    "reddit": "Reddit",
    "devto": "DevTo",
    "baidu": "Baidu",
    "bilibili": "Bilibili",
    "bili": "Bilibili",
    "technews": "TechNews",
    "36kr": "TechNews",
    "sspai": "TechNews",
}


@dataclass
class AggregateResult:
    items: list[dict[str, Any]] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def is_account_keyword(keyword: str) -> bool:
    return keyword.lstrip().startswith("@")


def extract_account_name(keyword: str) -> str:
    return keyword.lstrip().removeprefix("@").strip()


def normalize_source_filter(sources: list[str] | None) -> set[str] | None:
    if not sources:
        return None
    labels: set[str] = set()
    for s in sources:
        key = s.strip().lower()
        if not key:
            continue
        labels.add(SOURCE_ALIASES.get(key, s))
    return labels or None


def dedup(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for item in items:
        url = item.get("url") or ""
        if not url or url in seen:
            continue
        seen.add(url)
        out.append(item)
    return out


def filter_recent(items: list[dict[str, Any]], max_age_hours: int) -> list[dict[str, Any]]:
    now_ms = datetime.now(timezone.utc).timestamp() * 1000
    threshold = now_ms - max_age_hours * 3_600_000
    filtered: list[dict[str, Any]] = []
    for item in items:
        pub = item.get("publishedAt")
        if pub is None:
            filtered.append(item)
            continue
        if isinstance(pub, datetime):
            t = pub.timestamp() * 1000
        else:
            continue
        if t >= now_ms - 60_000:
            filtered.append(item)
            continue
        if t >= threshold:
            filtered.append(item)
    return filtered


def _run_parallel(
    tasks: list[tuple[str, SourceFn]],
    warnings: list[str],
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=max(1, len(tasks))) as pool:
        futures = {pool.submit(fn): label for label, fn in tasks}
        for fut in as_completed(futures):
            label = futures[fut]
            try:
                result = fut.result()
                if isinstance(result, tuple):
                    batch, warn = result[0], result[1] if len(result) > 1 else None
                    if warn:
                        warnings.append(f"{label}: {warn}")
                    items.extend(batch)
                else:
                    items.extend(result)
            except Exception as e:  # noqa: BLE001
                msg = f"{label} failed: {e}"
                warnings.append(msg)
                print(f"[Sources] {msg}", file=sys.stderr)
    return items


def _filter_tasks(
    tasks: list[tuple[str, SourceFn]],
    allowed: set[str] | None,
) -> list[tuple[str, SourceFn]]:
    if not allowed:
        return tasks
    return [(label, fn) for label, fn in tasks if label in allowed]


def aggregate_search(
    keyword: str,
    *,
    sources: list[str] | None = None,
) -> AggregateResult:
    is_account = is_account_keyword(keyword)
    clean = extract_account_name(keyword) if is_account else keyword
    warnings: list[str] = []
    if is_account:
        print(f"[Sources] Account mode: @{clean}", file=sys.stderr)

    all_tasks: list[tuple[str, SourceFn]] = [
        ("HN", lambda: hackernews.search(clean, 24)),
        ("GitHub", lambda: github.search(clean)),
        ("Bing", lambda: websearch.search(clean)),
        ("GoogleNews", lambda: googlenews.search(clean)),
        ("Reddit", lambda: reddit.search(clean)),
        ("DevTo", lambda: devto.search(clean)),
        ("Baidu", lambda: baidu.search(clean)),
        (
            "Bilibili",
            lambda: bilibili.search_user(clean)
            if is_account
            else bilibili.search(clean),
        ),
        ("TechNews", lambda: technews.search(clean)),
    ]
    allowed = normalize_source_filter(sources)
    tasks = _filter_tasks(all_tasks, allowed)
    max_age = 168 if is_account else 48
    raw = _run_parallel(tasks, warnings)
    items = filter_recent(dedup(raw), max_age)
    return AggregateResult(items=items, warnings=warnings)


def aggregate_trending(
    domain: str,
    *,
    sources: list[str] | None = None,
) -> AggregateResult:
    warnings: list[str] = []
    all_tasks: list[tuple[str, SourceFn]] = [
        ("HN", lambda: hackernews.trending(domain)),
        ("GitHub", lambda: github.trending()),
        ("Bing", lambda: websearch.search(f"{domain} 最新")),
        ("GoogleNews", lambda: googlenews.search(domain)),
        ("Reddit", lambda: reddit.trending(domain)),
        ("DevTo", lambda: devto.trending(domain)),
        ("Baidu", lambda: baidu.search(f"{domain} 最新")),
        ("Bilibili", lambda: bilibili.search(domain)),
        ("TechNews", lambda: technews.trending()),
    ]
    allowed = normalize_source_filter(sources)
    tasks = _filter_tasks(all_tasks, allowed)
    raw = _run_parallel(tasks, warnings)
    items = filter_recent(dedup(raw), 72)
    return AggregateResult(items=items, warnings=warnings)

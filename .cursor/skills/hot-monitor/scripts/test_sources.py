#!/usr/bin/env python3
"""Per-source health check (aligned with server test-sources.ts)."""
from __future__ import annotations

import argparse
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from lib import baidu, bilibili, devto, github, googlenews, hackernews, reddit, technews, websearch  # noqa: E402


def time_ago(d: datetime | None) -> str:
    if not d:
        return "N/A"
    mins = int((datetime.now(timezone.utc) - d).total_seconds() / 60)
    if mins < 1:
        return "刚刚"
    if mins < 60:
        return f"{mins}m 前"
    if mins < 1440:
        return f"{mins // 60}h 前"
    return f"{mins // 1440}d 前"


def _unwrap_items(result) -> tuple[list, str | None]:
    if isinstance(result, tuple):
        items, warn = result[0], result[1] if len(result) > 1 else None
        return items or [], warn
    return result or [], None


def test_one(name: str, fetcher) -> tuple[int, int, str]:
    t0 = time.time()
    try:
        items, warn = _unwrap_items(fetcher())
        elapsed = int((time.time() - t0) * 1000)
        count = len(items)
        latest = time_ago(items[0].get("publishedAt") if items else None)
        extra = ""
        if items and items[0].get("title"):
            extra = f' | "{str(items[0]["title"])[:50]}"'
        status = f"OK {count} 条 ({elapsed}ms) 最新:{latest}{extra}"
        if warn:
            status += f" ⚠ {warn[:60]}"
        return count, elapsed, status
    except Exception as e:
        elapsed = int((time.time() - t0) * 1000)
        return 0, elapsed, f"FAIL ({elapsed}ms) {e}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("keyword", nargs="?", default="AI")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    kw = args.keyword

    tests = [
        ("HackerNews", lambda: hackernews.search(kw, 24)),
        ("GitHub", lambda: github.search(kw)),
        ("Bing", lambda: websearch.search(kw)),
        ("GoogleNews", lambda: googlenews.search(kw)),
        ("Reddit", lambda: reddit.search(kw)),
        ("Dev.to", lambda: devto.search(kw)),
        ("Baidu", lambda: baidu.search(kw)),
        ("Bilibili", lambda: bilibili.search(kw)),
        ("36kr+sspai", lambda: technews.search(kw)),
    ]

    print(f"\n{'─' * 60}\n  HotMonitor 数据源检测 | 关键词: {kw}\n{'─' * 60}\n")
    results = []
    for name, fn in tests:
        print(f"  {name:<16} ... ", end="", flush=True)
        count, elapsed, msg = test_one(name, fn)
        print(msg)
        results.append({"source": name, "count": count, "elapsedMs": elapsed, "message": msg})

    ok = sum(1 for r in results if r["count"] > 0)
    print(f"\n{'─' * 60}\n  可用: {ok}/{len(tests)}\n{'─' * 60}\n")

    if args.json:
        import json

        print(json.dumps({"keyword": kw, "results": results}, ensure_ascii=False, indent=2))
    return 0 if ok >= 3 else 1


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Multi-source keyword search (no external AI API)."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from lib.aggregate import aggregate_search, is_account_keyword  # noqa: E402
from lib.cli_util import configure_stdout_utf8, write_json_output  # noqa: E402
from lib.creators import fetch_creator_posts, resolve_creator  # noqa: E402
from lib.keyword_expansion import expansion_json  # noqa: E402
from lib.rank import (  # noqa: E402
    annotate_prefilter,
    apply_prefilter,
    filter_today_only,
    sort_items,
)
from lib.types_util import item_to_dict  # noqa: E402


def _parse_sources(raw: str | None) -> list[str] | None:
    if not raw:
        return None
    return [s.strip() for s in raw.split(",") if s.strip()]


def main() -> int:
    configure_stdout_utf8()
    parser = argparse.ArgumentParser(description="HotMonitor multi-source search")
    parser.add_argument("keyword", nargs="?", help='Keyword or @account (e.g. "Codex", "@宝玉")')
    parser.add_argument("--creator", help="Known creator name (see creators.yaml)")
    parser.add_argument("--json", action="store_true", help="JSON output to stdout or --out")
    parser.add_argument("--out", help="Write JSON to file (recommended on Windows)")
    parser.add_argument("--limit", type=int, default=0, help="Max items (0 = all)")
    parser.add_argument(
        "--verify-top",
        type=int,
        default=5,
        help="Hint for Agent: verify top N items",
    )
    parser.add_argument(
        "--sources",
        help="Comma-separated: hn,github,bing,googlenews,reddit,devto,baidu,bilibili,technews",
    )
    parser.add_argument(
        "--prefilter",
        action="store_true",
        help="Drop items that fail local keyword_match",
    )
    parser.add_argument("--today-only", action="store_true", help="Keep only today's posts")
    parser.add_argument(
        "--tag",
        help="Extra filter for --creator (e.g. AI)",
    )
    args = parser.parse_args()

    warnings: list[str] = []
    items: list[dict] = []
    keyword = args.keyword or ""
    account_mode = False
    creator_name = args.creator

    if creator_name:
        items, w = fetch_creator_posts(
            creator_name,
            today_only=args.today_only,
            tag_filter=args.tag,
        )
        warnings.extend(w)
        keyword = keyword or creator_name
        resolved = resolve_creator(creator_name)
        if resolved:
            _name, cfg = resolved
            bili_name = cfg.get("bilibili_name") or _name
            from lib import bilibili  # noqa: E402

            bili_items, bwarn = bilibili.search_user(bili_name)
            if bwarn:
                warnings.append(f"Bilibili: {bwarn}")
            if args.today_only:
                from datetime import datetime, timezone

                today = datetime.now(timezone.utc).date()
                bili_items = [
                    x
                    for x in bili_items
                    if isinstance(x.get("publishedAt"), datetime)
                    and x["publishedAt"].astimezone(timezone.utc).date() == today
                ]
            items.extend(bili_items)
        if not keyword:
            keyword = creator_name
    elif keyword:
        account_mode = is_account_keyword(keyword)
        result = aggregate_search(keyword, sources=_parse_sources(args.sources))
        items = result.items
        warnings.extend(result.warnings)
        if account_mode and not any(i.get("source") == "bilibili" for i in items):
            warnings.append(
                "Bilibili returned no videos; try: python scripts/search_creator.py 程序员鱼皮 --today-only"
            )
    else:
        parser.error("Provide keyword or --creator")

    exp_json = expansion_json(keyword)
    items = sort_items(items, keyword)
    if args.prefilter:
        items = apply_prefilter(items, keyword, exp_json)
    else:
        items = annotate_prefilter(items, keyword, exp_json)

    if args.today_only and not creator_name:
        items = filter_today_only(items)

    if args.limit > 0:
        items = items[: args.limit]

    payload = {
        "keyword": keyword,
        "creator": creator_name,
        "accountMode": account_mode,
        "count": len(items),
        "verifyTopHint": args.verify_top,
        "queryExpansion": exp_json,
        "warnings": warnings,
        "items": [item_to_dict(i) for i in items],
    }

    if args.json or args.out:
        write_json_output(payload, args.out)
    else:
        print(f"Keyword: {keyword} | {len(items)} items")
        if warnings:
            print("Warnings:", "; ".join(warnings), file=sys.stderr)
        for i, it in enumerate(items[:20], 1):
            lp = it.get("localPass")
            mark = "✓" if lp else ("✗" if lp is False else "?")
            print(f"\n{i}. [{mark}] [{it.get('source')}] {it.get('title')}")
            print(f"   {it.get('url')}")
        if len(items) > 20:
            print(f"\n... and {len(items) - 20} more (use --json)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

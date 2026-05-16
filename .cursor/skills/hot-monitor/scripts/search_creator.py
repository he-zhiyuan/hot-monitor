#!/usr/bin/env python3
"""Fetch today's (or recent) posts from a known creator (codefather / Bilibili)."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from lib.cli_util import configure_stdout_utf8, write_json_output  # noqa: E402
from lib.creators import fetch_creator_posts  # noqa: E402
from lib.types_util import item_to_dict  # noqa: E402
from lib import bilibili  # noqa: E402
from lib.creators import resolve_creator  # noqa: E402
from datetime import datetime, timezone  # noqa: E402


def main() -> int:
    configure_stdout_utf8()
    parser = argparse.ArgumentParser(description="HotMonitor creator digest")
    parser.add_argument("creator", help="Creator name in creators.yaml (e.g. 程序员鱼皮)")
    parser.add_argument("--today-only", action="store_true", help="Only posts from today")
    parser.add_argument("--tag", default="AI", help="Filter posts by tag in title (default: AI)")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--out", help="Write JSON to file")
    parser.add_argument("--no-bilibili", action="store_true", help="Skip Bilibili supplement")
    args = parser.parse_args()

    items, warnings = fetch_creator_posts(
        args.creator,
        today_only=args.today_only,
        tag_filter=args.tag if args.tag else None,
    )

    if not args.no_bilibili:
        resolved = resolve_creator(args.creator)
        if resolved:
            _name, cfg = resolved
            bili_name = cfg.get("bilibili_name") or _name
            bili_items, bwarn = bilibili.search_user(bili_name)
            if bwarn:
                warnings.append(f"Bilibili: {bwarn}")
            if args.today_only:
                today = datetime.now(timezone.utc).date()
                bili_items = [
                    x
                    for x in bili_items
                    if isinstance(x.get("publishedAt"), datetime)
                    and x["publishedAt"].astimezone(timezone.utc).date() == today
                ]
            if args.tag:
                tf = args.tag.lower()
                bili_items = [
                    x
                    for x in bili_items
                    if tf in str(x.get("title", "")).lower()
                ]
            items.extend(bili_items)

    # Dedup by post id (ai_nav vs codefather same article)
    seen_ids: set[str] = set()
    seen_urls: set[str] = set()
    unique = []
    for it in items:
        u = it.get("url") or ""
        post_id = ""
        if "/post/" in u:
            post_id = u.rsplit("/post/", 1)[-1].split("?")[0]
        if post_id and post_id in seen_ids:
            continue
        if u in seen_urls:
            continue
        if post_id:
            seen_ids.add(post_id)
        seen_urls.add(u)
        unique.append(it)

    payload = {
        "creator": args.creator,
        "todayOnly": args.today_only,
        "tag": args.tag,
        "count": len(unique),
        "warnings": warnings,
        "items": [item_to_dict(i) for i in unique],
    }

    if args.json or args.out:
        write_json_output(payload, args.out)
    else:
        print(f"Creator: {args.creator} | {len(unique)} items")
        if warnings:
            print("Warnings:", "; ".join(warnings), file=sys.stderr)
        for i, it in enumerate(unique, 1):
            dl = it.get("dateLabel") or ""
            print(f"\n{i}. [{it.get('source')}] {it.get('title')}")
            if dl:
                print(f"   {dl[:60]}")
            print(f"   {it.get('url')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

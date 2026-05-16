#!/usr/bin/env python3
"""Multi-source trending / hotspot discovery (no external AI API)."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from lib.aggregate import aggregate_trending  # noqa: E402
from lib.cli_util import configure_stdout_utf8, write_json_output  # noqa: E402
from lib.rank import sort_items  # noqa: E402
from lib.types_util import item_to_dict  # noqa: E402


def _parse_sources(raw: str | None) -> list[str] | None:
    if not raw:
        return None
    return [s.strip() for s in raw.split(",") if s.strip()]


def main() -> int:
    configure_stdout_utf8()
    parser = argparse.ArgumentParser(description="HotMonitor trending aggregation")
    parser.add_argument("--domain", default="AI", help='Discovery domain (e.g. "AI编程")')
    parser.add_argument("--json", action="store_true", help="JSON output")
    parser.add_argument("--out", help="Write JSON to file")
    parser.add_argument("--limit", type=int, default=0, help="Max items")
    parser.add_argument("--sources", help="Comma-separated source filter")
    parser.add_argument("--score-top", type=int, default=10, help="Agent: score top N")
    args = parser.parse_args()

    result = aggregate_trending(args.domain, sources=_parse_sources(args.sources))
    items = sort_items(result.items, args.domain)
    if args.limit > 0:
        items = items[: args.limit]

    payload = {
        "domain": args.domain,
        "count": len(items),
        "scoreTopHint": args.score_top,
        "warnings": result.warnings,
        "items": [item_to_dict(i) for i in items],
    }

    if args.json or args.out:
        write_json_output(payload, args.out)
    else:
        print(f"Domain: {args.domain} | {len(items)} items")
        for i, it in enumerate(items[:20], 1):
            print(f"\n{i}. [{it.get('source')}] {it.get('title')}")
            print(f"   {it.get('url')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

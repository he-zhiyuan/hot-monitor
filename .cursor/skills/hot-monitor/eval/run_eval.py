#!/usr/bin/env python3
"""Local relevance regression (no external AI API)."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL_ROOT))

from rules.keyword_match import local_relevance_match  # noqa: E402

FIXTURES = SKILL_ROOT / "eval" / "verify-fixtures.json"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--list-agent",
        action="store_true",
        help="Print fixtures that need Agent AI verification",
    )
    args = parser.parse_args()

    fixtures = json.loads(FIXTURES.read_text(encoding="utf-8"))
    if args.list_agent:
        print("Agent should verify these fixtures using SKILL.md Verify template:\n")
        for f in fixtures:
            print(f"- {f['id']}: keyword={f['keyword']!r}")
            print(f"  title: {f['title']}")
            print(f"  expectMaxRelevance: {f.get('expectMaxRelevance', 'n/a')}")
            print(f"  expectEntityNotPrimary: {f.get('expectEntityNotPrimary', False)}\n")
        return 0

    passed = 0
    failed = 0
    for f in fixtures:
        got = local_relevance_match(
            f["keyword"],
            f["title"],
            f["content"],
            f.get("queryExpansion"),
        )
        expect = f.get("expectLocalPass", True)
        ok = got == expect
        status = "PASS" if ok else "FAIL"
        print(f"[{status}] {f['id']}: local={got} expect={expect}")
        if ok:
            passed += 1
        else:
            failed += 1

    print(f"\n{passed} passed, {failed} failed")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

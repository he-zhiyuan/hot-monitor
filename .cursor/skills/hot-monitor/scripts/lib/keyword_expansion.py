"""Query expansion JSON for local pre-filter (no LLM)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

_SKILL_ROOT = Path(__file__).resolve().parents[2]
if str(_SKILL_ROOT) not in sys.path:
    sys.path.insert(0, str(_SKILL_ROOT))

from rules.keyword_match import fallback_expansion  # noqa: E402


def expansion_json(keyword: str) -> str:
    exp = fallback_expansion(keyword)
    return json.dumps(exp, ensure_ascii=False)

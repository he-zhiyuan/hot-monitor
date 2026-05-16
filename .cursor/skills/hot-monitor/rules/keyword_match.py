"""
Local relevance pre-filter (ported from server/src/lib/keyword-match.ts).
"""
from __future__ import annotations

import json
import math
import re
from typing import TypedDict


class KeywordQueryExpansion(TypedDict, total=False):
    phrases: list[str]
    modelNotes: str


def normalize_for_match(s: str) -> str:
    return re.sub(r"\s+", " ", s.lower().replace("·", " ").replace("•", " ")).strip()


def _body(title: str, content: str) -> str:
    return normalize_for_match(f"{title} {content}")


def parse_expansion_json(raw: str | None) -> KeywordQueryExpansion | None:
    if not raw or not str(raw).strip():
        return None
    try:
        o = json.loads(raw)
        phrases = o.get("phrases")
        if not isinstance(phrases, list) or not phrases:
            return None
        normalized = list({normalize_for_match(str(p)) for p in phrases if normalize_for_match(str(p))})
        notes = o.get("modelNotes")
        return {
            "phrases": normalized,
            "modelNotes": str(notes)[:500] if notes else None,
        }
    except (json.JSONDecodeError, TypeError):
        return None


def fallback_expansion(keyword: str) -> KeywordQueryExpansion:
    k = normalize_for_match(keyword.strip())
    return {"phrases": [k] if k else [], "modelNotes": ""}


def significant_tokens(keyword: str) -> list[str]:
    tokens = []
    for t in normalize_for_match(keyword).split():
        t = re.sub(r"[^\w\u4e00-\u9fff.+-]", "", t, flags=re.IGNORECASE)
        if len(t) >= 2 and not re.match(r"^[\d.+-]+$", t):
            tokens.append(t)
    return tokens


def local_relevance_match(
    keyword: str,
    title: str,
    content: str,
    expansion_json: str | None = None,
) -> bool:
    text = _body(title, content)
    kw = normalize_for_match(keyword.strip())
    if not kw or not text:
        return False

    exp = parse_expansion_json(expansion_json) or fallback_expansion(keyword)
    phrases = exp.get("phrases") or fallback_expansion(keyword)["phrases"]
    sorted_phrases = sorted(phrases, key=len, reverse=True)
    min_phrase_len = max(4, min(16, math.ceil(len(kw) * 0.45)))

    for p in sorted_phrases:
        if not p or len(p) < 2:
            continue
        if p not in text:
            continue
        if len(p) < 3 and not re.search(r"\d", p):
            continue
        if len(kw.split()) >= 2 and len(p) < min_phrase_len and p != kw:
            continue
        return True

    if kw in text:
        return True

    tokens = significant_tokens(keyword)
    if not tokens:
        return False
    if len(tokens) == 1:
        return tokens[0] in text
    hits = [t for t in tokens if t in text]
    need = max(2, math.ceil(len(tokens) * 0.51))
    return len(hits) >= need

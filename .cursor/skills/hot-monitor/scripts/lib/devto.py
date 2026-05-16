from __future__ import annotations

from datetime import datetime, timezone

import requests

BASE = "https://dev.to/api"
AI_TAGS = ["ai", "machinelearning", "llm", "deeplearning", "chatgpt", "python"]
HEADERS = {"Accept": "application/json", "User-Agent": "HotMonitor-Skill/1.0"}


def _map_article(a: dict) -> dict:
    pub_raw = a.get("published_at")
    try:
        published = datetime.fromisoformat(str(pub_raw).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        published = datetime.now(timezone.utc)
    return {
        "title": a.get("title", ""),
        "url": a.get("url", ""),
        "content": a.get("description") or a.get("title", ""),
        "author": (a.get("user") or {}).get("name") or (a.get("user") or {}).get("username") or "",
        "publishedAt": published,
        "source": "devto",
        "likes": a.get("public_reactions_count") or 0,
        "comments": a.get("comments_count") or 0,
    }


def search(query: str) -> list[dict]:
    q_lower = query.lower()
    target_tags = [t for t in AI_TAGS if t in q_lower][:2]
    if not target_tags:
        target_tags = ["ai", "machinelearning"]
    first_word = q_lower.split()[0] if q_lower.split() else q_lower
    results: list[dict] = []
    for tag in target_tags:
        try:
            r = requests.get(
                f"{BASE}/articles",
                params={"tag": tag, "per_page": 30, "state": "fresh"},
                headers=HEADERS,
                timeout=12,
            )
            r.raise_for_status()
            for a in r.json() or []:
                text = f"{a.get('title', '')} {a.get('description', '')}".lower()
                if first_word in text:
                    results.append(_map_article(a))
        except Exception:
            pass
    return results


def trending(topic: str) -> list[dict]:
    topic_lower = (topic.lower().split() or [""])[0]
    try:
        r = requests.get(
            f"{BASE}/articles",
            params={"per_page": 30, "top": 1},
            headers=HEADERS,
            timeout=12,
        )
        r.raise_for_status()
        out: list[dict] = []
        for a in r.json() or []:
            tags = a.get("tag_list") or []
            text = f"{a.get('title', '')} {a.get('description', '')} {' '.join(tags)}".lower()
            if (topic_lower and topic_lower in text) or any(t in AI_TAGS for t in tags):
                out.append(_map_article(a))
        return out
    except Exception:
        return []

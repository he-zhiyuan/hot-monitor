from __future__ import annotations

from datetime import datetime, timezone

import requests

HN_API = "https://hn.algolia.com/api/v1"
UA = {"User-Agent": "HotMonitor-Skill/1.0"}


def _map_hit(h: dict) -> dict:
    url = h.get("url") or h.get("story_url") or f"https://news.ycombinator.com/item?id={h.get('objectID')}"
    created = h.get("created_at")
    pub = datetime.fromisoformat(created.replace("Z", "+00:00")) if created else datetime.now(timezone.utc)
    pts = h.get("points") or 0
    comments = h.get("num_comments") or 0
    return {
        "title": h.get("title", ""),
        "url": url,
        "content": h.get("story_text") or h.get("comment_text") or h.get("title", ""),
        "author": h.get("author") or "",
        "publishedAt": pub,
        "source": "hackernews",
        "likes": pts,
        "comments": comments,
    }


def search(query: str, hours_back: int = 24) -> list[dict]:
    since_ts = int(datetime.now(timezone.utc).timestamp()) - hours_back * 3600
    try:
        r = requests.get(
            f"{HN_API}/search_by_date",
            params={
                "query": query,
                "tags": "story",
                "numericFilters": f"created_at_i>{since_ts}",
                "hitsPerPage": 20,
            },
            headers=UA,
            timeout=10,
        )
        r.raise_for_status()
        hits = r.json().get("hits") or []
        return [
            _map_hit(h)
            for h in hits
            if h.get("title") and (h.get("url") or h.get("story_url"))
        ]
    except Exception:
        return []


def trending(query: str) -> list[dict]:
    try:
        r = requests.get(
            f"{HN_API}/search",
            params={
                "query": query,
                "tags": "story",
                "hitsPerPage": 30,
                "numericFilters": "points>10,num_comments>5",
            },
            headers=UA,
            timeout=10,
        )
        r.raise_for_status()
        hits = r.json().get("hits") or []
        return [
            _map_hit(h)
            for h in hits
            if h.get("title") and (h.get("url") or h.get("story_url"))
        ]
    except Exception:
        return []

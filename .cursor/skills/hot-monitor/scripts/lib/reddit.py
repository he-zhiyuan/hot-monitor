from __future__ import annotations

from datetime import datetime, timezone

import requests

AI_SUBREDDITS = [
    "LocalLLaMA",
    "MachineLearning",
    "ChatGPT",
    "ClaudeAI",
    "artificial",
    "programming",
    "singularity",
]
HEADERS = {
    "User-Agent": "HotMonitor-Skill/1.0 (personal news aggregator)",
    "Accept": "application/json",
}


def _map_post(d: dict) -> dict:
    url = d.get("url") or ""
    if url.startswith("/r/"):
        url = f"https://www.reddit.com{url}"
    elif not url:
        url = f"https://www.reddit.com{d.get('permalink', '')}"
    return {
        "title": d.get("title", ""),
        "url": url,
        "content": (d.get("selftext") or "")[:500] or d.get("title", ""),
        "author": d.get("author") or "",
        "publishedAt": datetime.fromtimestamp(d.get("created_utc", 0), tz=timezone.utc),
        "source": "reddit",
        "likes": d.get("score") or 0,
        "comments": d.get("num_comments") or 0,
    }


def search(query: str) -> list[dict]:
    out: list[dict] = []
    for sub in AI_SUBREDDITS[:3]:
        try:
            r = requests.get(
                f"https://www.reddit.com/r/{sub}/search.json",
                params={"q": query, "sort": "new", "t": "day", "limit": 15, "restrict_sr": 1},
                headers=HEADERS,
                timeout=8,
            )
            r.raise_for_status()
            children = r.json().get("data", {}).get("children") or []
            for p in children:
                d = p.get("data") or {}
                if (d.get("score") or 0) >= 5 and d.get("title"):
                    out.append(_map_post(d))
        except Exception:
            pass
    return out


def trending(topic: str) -> list[dict]:
    cutoff = datetime.now(timezone.utc).timestamp() - 48 * 3600
    topic_kw = (topic.lower().split() or [""])[0]
    out: list[dict] = []
    for sub in AI_SUBREDDITS:
        try:
            r = requests.get(
                f"https://www.reddit.com/r/{sub}/hot.json",
                params={"limit": 15},
                headers=HEADERS,
                timeout=8,
            )
            r.raise_for_status()
            children = r.json().get("data", {}).get("children") or []
            for p in children:
                d = p.get("data") or {}
                if not d.get("title") or (d.get("score") or 0) < 10:
                    continue
                if (d.get("created_utc") or 0) < cutoff:
                    continue
                text = f"{d.get('title')} {d.get('selftext') or ''} {d.get('subreddit')}".lower()
                if topic_kw and topic_kw not in text:
                    continue
                out.append(_map_post(d))
        except Exception:
            pass
    return out

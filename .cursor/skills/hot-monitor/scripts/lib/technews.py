from __future__ import annotations

import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import feedparser
import requests

RSS_FEEDS = [
    ("https://36kr.com/feed", "36kr"),
    ("https://sspai.com/feed", "sspai"),
]
UA = {
    "User-Agent": "Mozilla/5.0 (compatible; HotMonitor-Skill/1.0)",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
}


def _matches_keyword(keyword: str, title: str, desc: str) -> bool:
    text = f"{title} {desc}".lower()
    kw = keyword.lower().strip()
    if not kw:
        return True
    if kw in text:
        return True
    tokens = [t for t in re.split(r"\s+", kw) if len(t) >= 3]
    if not tokens:
        tokens = [kw] if len(kw) >= 3 else []
    return any(t in text for t in tokens)


def _fetch_rss(
    feed_url: str,
    source: str,
    keyword: str | None = None,
    max_age_hours: int = 72,
) -> list[dict]:
    try:
        r = requests.get(feed_url, headers=UA, timeout=12)
        r.raise_for_status()
        parsed = feedparser.parse(r.content)
        items: list[dict] = []
        for i, entry in enumerate(parsed.entries[:20]):
            title = entry.get("title", "").strip()
            link = entry.get("link") or entry.get("id") or ""
            if not link.startswith("http"):
                continue
            desc = entry.get("summary", "") or ""
            desc = re.sub(r"<[^>]+>", "", desc).strip()
            pub_raw = entry.get("published") or entry.get("updated")
            if pub_raw:
                try:
                    published = parsedate_to_datetime(pub_raw)
                    if published.tzinfo is None:
                        published = published.replace(tzinfo=timezone.utc)
                    age_h = (datetime.now(timezone.utc) - published).total_seconds() / 3600
                    if age_h > max_age_hours:
                        continue
                except Exception:
                    published = datetime.now(timezone.utc)
            else:
                published = datetime.now(timezone.utc)
            if keyword and not _matches_keyword(keyword, title, desc):
                continue
            author = entry.get("author", "")
            items.append(
                {
                    "title": title,
                    "url": link,
                    "content": (desc[:400] if desc else title),
                    "author": author,
                    "publishedAt": published,
                    "source": source,
                }
            )
        return items
    except Exception:
        return []


def search(keyword: str) -> list[dict]:
    out: list[dict] = []
    for url, source in RSS_FEEDS:
        out.extend(_fetch_rss(url, source, keyword, 48))
    return out


def trending() -> list[dict]:
    out: list[dict] = []
    for url, source in RSS_FEEDS:
        out.extend(_fetch_rss(url, source, None, 72))
    return out

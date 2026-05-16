from __future__ import annotations

import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import feedparser
import requests

UA = {
    "User-Agent": "Mozilla/5.0 (compatible; HotMonitor-Skill/1.0)",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
}


def _parse_feed(xml: str) -> list[dict]:
    parsed = feedparser.parse(xml)
    items: list[dict] = []
    for i, entry in enumerate(parsed.entries[:8]):
        raw_title = entry.get("title", "").strip()
        title = re.sub(r"\s*-\s*[^-]+$", "", raw_title).strip() or raw_title
        link = entry.get("link") or entry.get("id") or ""
        if not link.startswith("http"):
            continue
        desc = entry.get("summary", "") or ""
        desc = re.sub(r"<[^>]+>", "", desc).strip()
        pub = entry.get("published") or entry.get("updated")
        if pub:
            try:
                published = parsedate_to_datetime(pub)
                if published.tzinfo is None:
                    published = published.replace(tzinfo=timezone.utc)
            except Exception:
                published = datetime.now(timezone.utc)
        else:
            published = datetime.now(timezone.utc)
        source_name = ""
        if entry.get("source"):
            source_name = entry.source.get("title", "") if hasattr(entry.source, "get") else str(entry.source)
        items.append(
            {
                "title": title,
                "url": link,
                "content": desc or title,
                "author": source_name,
                "publishedAt": published,
                "source": "googlenews",
            }
        )
    return items


def search(query: str) -> list[dict]:
    encoded = requests.utils.quote(query)
    urls = [
        f"https://news.google.com/rss/search?q={encoded}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans",
        f"https://news.google.com/rss/search?q={encoded}&hl=en-US&gl=US&ceid=US:en",
    ]
    all_items: list[dict] = []
    seen: set[str] = set()
    for rss_url in urls:
        try:
            r = requests.get(rss_url, headers=UA, timeout=8)
            r.raise_for_status()
            for item in _parse_feed(r.text):
                if item["url"] not in seen:
                    seen.add(item["url"])
                    all_items.append(item)
        except Exception:
            pass
    return all_items

from __future__ import annotations

from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

UA = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}


def search(query: str) -> list[dict]:
    try:
        r = requests.get(
            "https://www.bing.com/search",
            params={"q": query, "count": 10, "setlang": "zh-CN"},
            headers=UA,
            timeout=12,
        )
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        results: list[dict] = []
        for i, el in enumerate(soup.select("#b_results .b_algo")):
            if i >= 10:
                break
            a = el.select_one("h2 a")
            if not a:
                continue
            title = a.get_text(strip=True)
            url = a.get("href") or ""
            cap = el.select_one(".b_caption p")
            snippet = cap.get_text(strip=True) if cap else title
            if title and url.startswith("http"):
                results.append(
                    {
                        "title": title,
                        "url": url,
                        "content": snippet,
                        "author": "",
                        "publishedAt": datetime.now(timezone.utc),
                        "source": "web",
                    }
                )
        return results
    except Exception:
        return []

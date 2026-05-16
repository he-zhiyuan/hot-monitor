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
    "Accept-Language": "zh-CN,zh;q=0.9",
}


def search(query: str) -> list[dict]:
    try:
        r = requests.get(
            "https://www.baidu.com/s",
            params={"wd": query, "rn": 10, "ie": "utf-8"},
            headers=UA,
            timeout=12,
        )
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        results: list[dict] = []
        for i, el in enumerate(soup.select("#content_left .result, #content_left .result-op")):
            if i >= 10:
                break
            link = el.select_one("h3 a")
            if not link:
                continue
            title = link.get_text(strip=True)
            url = link.get("href") or ""
            snippet_el = (
                el.select_one(".c-abstract")
                or el.select_one('[class*="abstract"]')
                or el.select_one(".content-right")
            )
            snippet = snippet_el.get_text(strip=True) if snippet_el else title
            if title and url.startswith("http"):
                results.append(
                    {
                        "title": title,
                        "url": url,
                        "content": snippet,
                        "author": "",
                        "publishedAt": datetime.now(timezone.utc),
                        "source": "baidu",
                    }
                )
        return results
    except Exception:
        return []

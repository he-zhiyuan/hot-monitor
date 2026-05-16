from __future__ import annotations

import re
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

UA = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def _parse_stars(text: str) -> int:
    text = text.replace(",", "").strip()
    m = re.search(r"([\d.]+)\s*([kKmM])?", text)
    if not m:
        return 0
    num = float(m.group(1))
    suffix = (m.group(2) or "").lower()
    if suffix == "k":
        return int(num * 1000)
    if suffix == "m":
        return int(num * 1_000_000)
    return int(num)


def trending(language: str = "", since: str = "daily") -> list[dict]:
    path = f"/trending/{language}" if language else "/trending"
    url = f"https://github.com{path}?since={since}"
    try:
        r = requests.get(url, headers=UA, timeout=15)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        repos: list[dict] = []
        for row in soup.select("article.Box-row"):
            link = row.select_one("h2 a")
            if not link or not link.get("href"):
                continue
            repo_path = link["href"].strip()
            repo_name = repo_path.lstrip("/")
            desc = row.select_one("p")
            description = desc.get_text(strip=True) if desc else repo_name
            lang_el = row.select_one('[itemprop="programmingLanguage"]')
            language_name = lang_el.get_text(strip=True) if lang_el else ""
            stars_el = row.select_one('a[href$="/stargazers"]')
            stars_text = stars_el.get_text(strip=True) if stars_el else "0"
            today_el = row.select_one(".float-sm-right")
            today_text = today_el.get_text(strip=True) if today_el else ""
            today_match = re.search(r"([\d,]+)\s*stars today", today_text)
            today_stars = int(today_match.group(1).replace(",", "")) if today_match else 0
            stars = _parse_stars(stars_text)
            repos.append(
                {
                    "title": f"[GitHub Trending] {repo_name}",
                    "url": f"https://github.com{repo_path}",
                    "content": description,
                    "author": repo_name.split("/")[0] if "/" in repo_name else "",
                    "publishedAt": datetime.now(timezone.utc),
                    "source": "github",
                    "likes": today_stars,
                    "views": stars,
                }
            )
        return repos
    except Exception:
        return []


def search(query: str) -> list[dict]:
    lower = query.lower()
    return [
        item
        for item in trending()
        if lower in item["title"].lower() or lower in item["content"].lower()
    ]

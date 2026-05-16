"""Fetch posts from creator profiles (codefather / ai-nav)."""
from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import requests
import yaml
from bs4 import BeautifulSoup

UA = {
    "User-Agent": "Mozilla/5.0 (compatible; HotMonitor-Skill/1.0)",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}

_POST_HREF = re.compile(r"/post/(\d+)")
_DATE_TODAY = re.compile(r"今天\s*(\d{1,2}):(\d{2})")
_DATE_MD = re.compile(r"(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})")
_DATE_REL = re.compile(r"(\d+)\s*天前")
_DATE_MON = re.compile(r"(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})")


def _load_registry() -> dict[str, Any]:
    path = Path(__file__).resolve().parents[2] / "creators.yaml"
    if not path.exists():
        return {}
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def resolve_creator(name: str) -> tuple[str, dict[str, Any]] | None:
    reg = _load_registry()
    if name in reg:
        return name, reg[name]
    for key, cfg in reg.items():
        aliases = cfg.get("aliases") or []
        if name == key or name in aliases:
            return key, cfg
    return None


def _parse_date_label(label: str) -> tuple[datetime | None, str, bool]:
    """Return (publishedAt, dateLabel, is_today)."""
    label = label.strip()
    now = datetime.now(timezone.utc)
    m = _DATE_TODAY.search(label)
    if m:
        h, mi = int(m.group(1)), int(m.group(2))
        pub = now.replace(hour=h, minute=mi, second=0, microsecond=0)
        return pub, label, True
    if "今天" in label:
        return now, label, True
    m = _DATE_MD.search(label)
    if m:
        y, mo, d, h, mi = map(int, m.groups())
        pub = datetime(y, mo, d, h, mi, tzinfo=timezone.utc)
        is_today = pub.date() == now.date()
        return pub, label, is_today
    m = _DATE_REL.search(label)
    if m:
        days = int(m.group(1))
        pub = now.replace(hour=12, minute=0, second=0, microsecond=0)
        from datetime import timedelta

        pub = pub - timedelta(days=days)
        return pub, label, days == 0
    return None, label, False


def _extract_posts_from_html(html: str, base_url: str, source: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    seen: set[str] = set()
    items: list[dict[str, Any]] = []

    for a in soup.find_all("a", href=_POST_HREF):
        href = a.get("href") or ""
        post_id = _POST_HREF.search(href)
        if not post_id:
            continue
        url = href if href.startswith("http") else urljoin(base_url, href)
        if url in seen:
            continue
        title = a.get_text(" ", strip=True)
        if not title or len(title) < 6:
            continue
        if title in ("查看全文", "阅读", "分享", "+ 关注"):
            continue

        date_label = ""
        parent = a.parent
        for _ in range(6):
            if not parent:
                break
            text = parent.get_text(" ", strip=True)
            if "今天" in text or "天前" in text or re.search(r"\d{4}-\d{2}-\d{2}", text):
                date_label = text[:80]
                break
            parent = parent.parent

        pub, label, is_today = _parse_date_label(date_label)
        seen.add(url)
        items.append(
            {
                "title": title,
                "url": url,
                "content": title,
                "author": "",
                "publishedAt": pub or datetime.now(timezone.utc),
                "source": source,
                "dateLabel": label or date_label,
                "relativeDate": "today" if is_today else "",
            }
        )
    return items


def fetch_creator_posts(
    creator_name: str,
    *,
    today_only: bool = False,
    tag_filter: str | None = None,
) -> tuple[list[dict[str, Any]], list[str]]:
    resolved = resolve_creator(creator_name)
    if not resolved:
        return [], [f"Unknown creator: {creator_name} (add to creators.yaml)"]

    _key, cfg = resolved
    warnings: list[str] = []
    items: list[dict[str, Any]] = []

    for url_key, source in (
        ("ai_nav_user", "ai_nav"),
        ("codefather_user", "codefather"),
    ):
        page_url = cfg.get(url_key)
        if not page_url:
            continue
        try:
            r = requests.get(page_url, headers=UA, timeout=15)
            r.raise_for_status()
            base = "https://ai.codefather.cn" if "ai.codefather" in page_url else "https://www.codefather.cn"
            posts = _extract_posts_from_html(r.text, base, source)
            items.extend(posts)
        except Exception as e:  # noqa: BLE001
            warnings.append(f"{url_key} failed: {e}")

    # Dedup by URL
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for it in items:
        u = it.get("url") or ""
        if u in seen:
            continue
        seen.add(u)
        unique.append(it)

    if tag_filter:
        tf = tag_filter.lower()
        unique = [
            it
            for it in unique
            if tf in str(it.get("title", "")).lower() or tf in str(it.get("content", "")).lower()
        ]

    if today_only:
        unique = [it for it in unique if it.get("relativeDate") == "today" or "今天" in str(it.get("dateLabel") or "")]

    # Sort: today first, then by publishedAt desc
    unique.sort(
        key=lambda x: (
            0 if x.get("relativeDate") == "today" else 1,
            -(x.get("publishedAt") or datetime.min.replace(tzinfo=timezone.utc)).timestamp(),
        ),
    )
    return unique, warnings

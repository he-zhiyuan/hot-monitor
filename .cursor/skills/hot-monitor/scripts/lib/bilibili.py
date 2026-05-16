from __future__ import annotations

import re
from datetime import datetime, timezone

import requests

BASE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.bilibili.com",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Origin": "https://www.bilibili.com",
}

_cached_buvid3 = ""


def _get_buvid3() -> str:
    global _cached_buvid3
    if _cached_buvid3:
        return _cached_buvid3
    try:
        r = requests.get(
            "https://api.bilibili.com/x/frontend/finger/spi",
            headers=BASE_HEADERS,
            timeout=8,
        )
        data = r.json()
        if data.get("code") == 0:
            _cached_buvid3 = (data.get("data") or {}).get("b_3") or ""
    except Exception:
        pass
    return _cached_buvid3


def _headers() -> dict[str, str]:
    h = dict(BASE_HEADERS)
    buvid = _get_buvid3()
    if buvid:
        h["Cookie"] = f"buvid3={buvid}"
    return h


def _clean_title(title: str) -> str:
    return re.sub(r"<[^>]+>", "", title).strip()


def _map_video(v: dict, author: str | None = None) -> dict:
    return {
        "title": _clean_title(v.get("title", "")),
        "url": f"https://www.bilibili.com/video/{v.get('bvid')}",
        "content": v.get("description") or _clean_title(v.get("title", "")),
        "author": author or v.get("author") or "",
        "publishedAt": datetime.fromtimestamp(v.get("pubdate", 0), tz=timezone.utc),
        "source": "bilibili",
        "views": v.get("play") or 0,
        "likes": v.get("like") or 0,
        "comments": v.get("review") or 0,
    }


def _parse_json_response(r: requests.Response) -> tuple[dict | None, str | None]:
    try:
        return r.json(), None
    except Exception:
        snippet = (r.text or "")[:120]
        return None, f"non-JSON response (HTTP {r.status_code}): {snippet!r}"


def search(keyword: str) -> tuple[list[dict], str | None]:
    try:
        r = requests.get(
            "https://api.bilibili.com/x/web-interface/search/type",
            params={
                "search_type": "video",
                "keyword": keyword,
                "order": "pubdate",
                "page": 1,
                "page_size": 15,
            },
            headers=_headers(),
            timeout=12,
        )
        data, err = _parse_json_response(r)
        if err:
            return [], err
        if not data or data.get("code") != 0:
            code = data.get("code") if data else "?"
            msg = (data or {}).get("message", "unknown")
            return [], f"API code={code} {msg}"
        cutoff = int(datetime.now(timezone.utc).timestamp()) - 7 * 86400
        videos = data.get("data", {}).get("result") or []
        items = [
            _map_video(v)
            for v in videos
            if v.get("bvid") and v.get("title") and (v.get("pubdate") or 0) >= cutoff
        ]
        return items, None
    except Exception as e:
        return [], str(e)


def search_user(username: str) -> tuple[list[dict], str | None]:
    try:
        headers = _headers()
        user_res = requests.get(
            "https://api.bilibili.com/x/web-interface/search/type",
            params={"search_type": "bili_user", "keyword": username, "page": 1},
            headers=headers,
            timeout=10,
        )
        user_data, err = _parse_json_response(user_res)
        if err:
            return [], f"bili_user: {err}"
        if not user_data or user_data.get("code") != 0:
            code = user_data.get("code") if user_data else "?"
            return [], f"bili_user API code={code}"
        users = user_data.get("data", {}).get("result") or []
        if not users:
            return [], f"no UP主 found for {username!r}"

        matched = next((u for u in users if u.get("uname") == username), users[0])
        exact_name = matched.get("uname", username)

        video_res = requests.get(
            "https://api.bilibili.com/x/web-interface/search/type",
            params={
                "search_type": "video",
                "keyword": exact_name,
                "order": "pubdate",
                "page": 1,
                "page_size": 20,
            },
            headers=headers,
            timeout=10,
        )
        vdata, err = _parse_json_response(video_res)
        if err:
            return [], f"video search: {err}"
        if not vdata or vdata.get("code") != 0:
            code = vdata.get("code") if vdata else "?"
            return [], f"video API code={code} (风控时可用 search_creator.py)"
        cutoff = int(datetime.now(timezone.utc).timestamp()) - 30 * 86400
        videos = vdata.get("data", {}).get("result") or []
        items = [
            _map_video(v, exact_name)
            for v in videos
            if v.get("bvid")
            and v.get("title")
            and v.get("author") == exact_name
            and (v.get("pubdate") or 0) >= cutoff
        ]
        return items, None
    except Exception as e:
        return [], str(e)

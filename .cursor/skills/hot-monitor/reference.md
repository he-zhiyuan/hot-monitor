# HotMonitor Skill — Reference

Behavior aligned with `server/src/lib/sources/` (Twitter **not** included in skill).

## Sources (9)

| source | Search | Trending | Notes |
|--------|--------|----------|-------|
| hackernews | Algolia `search_by_date`, 24h | `points>10`, `num_comments>5` | Stable |
| github | Filter daily trending | Full trending page | `publishedAt` = now |
| web (Bing) | HTML scrape | `{domain} 最新` | CN-friendly |
| googlenews | zh-CN + en-US RSS parallel, 8s timeout | Same | May timeout in CN |
| reddit | 3 subreddits, score≥5 | 7 subs hot, score≥10, 48h | May timeout in CN |
| devto | AI tags + title match | top=1 + tag filter | |
| baidu | HTML scrape | `{domain} 最新` | `publishedAt` = now |
| bilibili | 7d videos | domain search | `@user` → UP主 mode |
| 36kr / sspai | RSS keyword, 48h | RSS 72h no keyword | |

## Time filters (`aggregate.py`)

| Mode | max age |
|------|---------|
| Normal search | 48h |
| Account search | 168h (7d) |
| Trending | 72h |

**Keep** items when `publishedAt` missing or within 60s of now (Baidu/Bing placeholder).

## Account mode

- Trigger: keyword `@{name}`
- Bilibili: `search_user` — resolve UP主, filter `author === exactName`, 30d
- Others: search `cleanName` without `@`

## Local pre-filter

See `rules/keyword_match.py` — longest phrase first; multi-token majority rule; avoid single generic token hits.

## CLI ranking (skill-only)

After aggregation, `lib/rank.py`:

- Drops low-quality Baidu (翻译/词典/主页)
- Sorts by source weight + engagement + recency
- `--prefilter` uses `rules/keyword_match.py`

## Creators (`creators.yaml`)

| Field | Purpose |
|-------|---------|
| `ai_nav_user` | Scrape https://ai.codefather.cn/user/… |
| `codefather_user` | Scrape https://www.codefather.cn/user/… |
| `bilibili_name` | Optional Bilibili supplement |

## Push threshold

`isReal && relevance >= 0.65` (default; user may override in conversation).

## Entity match ceilings

See SKILL.md Verify template table.

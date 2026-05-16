# HotMonitor Agent Skill

Standalone Cursor skill: **9 data sources** + **creator profiles** + **Agent-side verification** (no API keys).

Does not modify `server/` or `client/`.

## Install

```bash
cd .cursor/skills/hot-monitor
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

Python **3.10+** required.

## Quick examples

```bash
# Keyword (ranked + localPass)
python scripts/search.py "Codex" --json --prefilter --out result.json

# 博主今天 AI 内容
python scripts/search_creator.py 程序员鱼皮 --today-only --tag AI --json

# 国内快搜
python scripts/search.py "Claude" --sources baidu,googlenews,technews --prefilter --json
```

## What's new (v1.1)

| Feature | Description |
|---------|-------------|
| UTF-8 / `--out` | Windows-safe JSON output |
| `--prefilter` | `keyword_match` local gate |
| Ranking | Deprioritize Baidu noise, boost HN/GNews/B站 |
| `--sources` | Partial source runs |
| `--creator` / `search_creator.py` | 编程导航 / 鱼皮 AI 导航 scraping |
| `creators.yaml` | Extensible creator registry |
| Bilibili warnings | Clear 风控 / JSON errors in `warnings` |

## Cursor usage

Ask: *「用 hot-monitor 搜 Codex 并给推送建议」* or *「程序员鱼皮今天发了什么 AI 内容」*

## Troubleshooting

| Issue | Action |
|-------|--------|
| `UnicodeEncodeError` | Use `--out file.json` (or upgrade: stdout UTF-8 auto) |
| Bilibili 0 条 | Use `search_creator.py`; check `warnings` |
| Slow | `--sources baidu,googlenews,technews` |
| Empty @account | Run creator workflow; Bilibili API may block |

## Sync with main app

Logic ported from `server/src/lib/sources/*`. Update skill `scripts/lib/*` when server adapters change.

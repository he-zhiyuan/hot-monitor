---
name: hot-monitor
description: >-
  Monitors AI/tech hotspots across 9 free sources (HN, GitHub, Reddit, Dev.to,
  Google News, Bing, Baidu, Bilibili, 36kr/sspai) plus codefather creators.
  Python CLI with ranking and local pre-filter; Agent verifies relevance without
  API keys. Use for keyword monitoring, @account tracking, creator daily digest
  (程序员鱼皮), hotspot discovery, or 热点监控 / AI 资讯 / Codex / Claude releases.
---

# HotMonitor Skill

Python CLI fetches data; **you (the Agent) perform AI verification** — no EasyRouter/OpenRouter/Twitter keys.

Skill root: `.cursor/skills/hot-monitor/`

## Setup (first use)

```bash
cd .cursor/skills/hot-monitor
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

**Windows**: prefer `--out result.json` or rely on built-in UTF-8 stdout fix.

## Commands

| Task | Command |
|------|---------|
| Keyword search | `python scripts/search.py "Codex" --json --prefilter` |
| Account mode | `python scripts/search.py "@宝玉" --json` |
| Creator today + AI | `python scripts/search_creator.py 程序员鱼皮 --today-only --tag AI --json` |
| Same via search | `python scripts/search.py --creator 程序员鱼皮 --today-only --tag AI --json` |
| Trending | `python scripts/trending.py --domain "AI编程" --json` |
| Source health | `python scripts/test_sources.py "大模型"` |
| Local eval | `python eval/run_eval.py` |
| Save JSON (Win) | `... --json --out /tmp/out.json` |

### Useful flags

| Flag | Effect |
|------|--------|
| `--prefilter` | Drop items failing `rules/keyword_match.py` |
| `--sources hn,googlenews,baidu` | Run subset of sources (faster, CN-friendly) |
| `--today-only` | Keep posts from today only |
| `--out file.json` | Write JSON to file |
| `--creator NAME` | Use `creators.yaml` + optional Bilibili |

## Workflow A: Keyword monitor

1. Run `search.py` with `--json --prefilter` (or `--out`).
2. Read `warnings` in JSON; if Bilibili empty for `@user`, run `search_creator.py`.
3. Verify top `verifyTopHint` (default 5) with **Verify template**.
4. Prefer items with `localPass: true` when present.

**Push threshold**: `isReal && relevance >= 0.65`.

## Workflow B: Hotspot discovery

1. `trending.py --json`
2. Score top N with **Heat template**; list `heatScore >= 3`.

## Workflow C: Source health

`test_sources.py`. If &lt; 3 sources OK, warn (Reddit/GNews often fail in CN). Suggest `--sources baidu,googlenews,technews,bilibili`.

## Workflow D: Regression

`python eval/run_eval.py` and `run_eval.py --list-agent`.

## Workflow E: Creator daily digest

When user asks「某博主今天发了什么」「鱼皮 AI 热点」:

1. `python scripts/search_creator.py {name} --today-only --tag AI --json --out /tmp/creator.json`
2. If empty, retry without `--today-only` or `--tag`.
3. If `warnings` mention Bilibili 风控, still use codefather items; optional `WebFetch` on post URL for summary.
4. Output digest table (no need for full Verify on creator's own posts unless cross-checking news).

Add new creators in [creators.yaml](creators.yaml).

## Workflow F: Agent fallback

If CLI returns few items:

1. Check `warnings`
2. `test_sources.py`
3. For known creators → Workflow E
4. `WebFetch` article URL only when needed; label source in report

---

## Verify template

```json
{
  "isReal": true,
  "entityMatch": "primary|related_product|tangential|unrelated",
  "relevance": 0.0,
  "evidence": "原文摘录",
  "summary": "与监控词关系的一句话",
  "reason": "判定理由"
}
```

| entityMatch | max relevance |
|-------------|---------------|
| primary | 1.0 |
| related_product | 0.75 |
| tangential | 0.45 |
| unrelated | 0.2 |

---

## Heat template

```json
{ "heatScore": 0, "summary": "中文摘要" }
```

---

## Output format

```markdown
# 热点监控：{keyword}

## 摘要
- 共 {count} 条，建议推送 {n} 条
- 数据源警告：（如有）

## 建议推送
| 来源 | 标题 | 相关度 | 摘要 |

## 仅归档
...
```

---

## Additional resources

- [reference.md](reference.md) — sources & filters
- [README.md](README.md) — install & troubleshooting
- [examples.md](examples.md) — sample invocations

# HotMonitor Skill — Examples

## Keyword + push report

```bash
python scripts/search.py "Codex" --json --prefilter --out /tmp/codex.json
```

Agent reads JSON, verifies top 5, outputs 建议推送 / 仅归档.

## Creator today (程序员鱼皮)

```bash
python scripts/search_creator.py 程序员鱼皮 --today-only --tag AI --json --out /tmp/yupi.json
```

## China-friendly fast search

```bash
python scripts/search.py "大模型" --sources baidu,googlenews,technews --prefilter --json
```

## Account mode with fallback

```bash
python scripts/search.py "@程序员鱼皮" --json
# If warnings + no bilibili → search_creator.py 程序员鱼皮 --today-only
```

## Trending

```bash
python scripts/trending.py --domain "AI编程" --sources hn,googlenews,reddit --json
```

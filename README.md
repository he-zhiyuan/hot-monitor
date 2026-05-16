# HotMonitor 🔥 AI 热点监控系统

> 自动监控 AI 领域热点，第一时间获取大模型更新、AI 编程工具发布等重要资讯

## 功能特性

| 功能 | 描述 |
|------|------|
| 关键词监控 | Query expansion + 分层 AI 相关性审核，低于阈值入库不推送 |
| 账号监控 | 关键词以 `@` 开头时直接拉取该账号（B站 UP主）最新内容 |
| 热点发现 | 自动聚合多源热点，AI 打热度分（0-10） |
| 通知中心 | 站内通知历史，支持 Socket.IO 实时推送 + 邮件 |
| 10 大数据源 | 国际 + 国内全覆盖，无需 API Key 即可运行 |
| AI 过滤 | EasyRouter/OpenRouter：真实性 + 实体匹配 + 可配置相关度阈值 |

## 数据源

### 国际源

| 来源 | 类型 | 成本 | 说明 |
|------|------|------|------|
| Twitter/X | 付费 API | $0.15/1k tweets | **可选**，需 twitterapi.io Key；内置高质量过滤（min_faves:10, -is:reply） |
| Hacker News | 免费 API | 免费 | Algolia 搜索，英文技术社区，质量最稳定 |
| GitHub Trending | 爬虫 | 免费 | 每日 Trending 仓库 |
| Reddit | 免费 JSON API | 免费 | AI 相关子版块（LocalLLaMA/MachineLearning 等）；**国内网络可能超时** |
| Dev.to | 免费官方 API | 免费 | 开发者技术文章，按 AI 标签聚合 |
| Google News RSS | 免费 RSS | 免费 | 中英文科技新闻；**国内网络可能超时** |
| Bing 搜索 | 爬虫 | 免费 | 国内可访问，网页搜索兜底 |

### 国内源（国内网络直连）

| 来源 | 类型 | 成本 | 说明 |
|------|------|------|------|
| 百度搜索 | 爬虫 | 免费 | 覆盖中文网页，英文关键词匹配效果一般 |
| B站 Bilibili | 公开 JSON API | 免费 | AI 视频内容；`@账号名` 模式可直接拉 UP主 主页 |
| 36氪 + 少数派 | RSS | 免费 | 国内科技媒体，仅保留 48h 内文章 |

> Twitter 为可选项，其余 9 个源均无需 API Key，开箱即用。  
> 国内网络下 Reddit / Google News 会超时（已优化为并行8s超时，不阻塞其他源）。

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example server/.env
```

编辑 `server/.env`：

```env
# AI 服务（二选一）
EASYROUTER_API_KEY=sk-...        # 推荐，国内稳定，https://easyrouter.io
OPENROUTER_API_KEY=sk-or-...     # 备用，https://openrouter.ai

# 可选：Twitter 数据源（不填则跳过，其余9个源照常工作）
TWITTERAPI_IO_KEY=...            # https://twitterapi.io

# 可选：邮件通知（QQ 邮箱示例）
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=your@qq.com
SMTP_PASS=your-authorization-code
NOTIFY_EMAIL_TO=your@qq.com

# 可选：全局默认推送相关度下限（0-1，默认 0.65；单条监控可覆盖）
# MONITOR_MIN_RELEVANCE=0.65
```

### 2. 安装依赖

```bash
npm run install:all
```

### 3. 初始化数据库

```bash
npm run db:push
```

### 4. 启动开发服务器

```bash
npm run dev
```

- 前端：http://localhost:5173
- 后端 API：http://localhost:3001

## 账号监控模式

关键词以 `@` 开头时进入账号模式：

| 普通关键词 | 账号关键词 |
|-----------|-----------|
| `Claude 5` | `@宝玉` |
| 在所有源中搜索关键词文本 | B站直接拉取该 UP主 最新投稿 + Twitter 精确匹配 @handle + 其余源搜索账号名 |

## 技术栈

- **后端**：Express.js + TypeScript + Prisma + SQLite
- **前端**：React + Vite + TypeScript + Tailwind CSS + Framer Motion
- **AI**：EasyRouter / OpenRouter（默认模型 Gemini 2.5 Flash）
- **实时通知**：Socket.IO + 邮件（Nodemailer）

## 项目结构

```
hot-monitor/
├── server/src/lib/sources/   # 数据源适配器（10个）
│   ├── twitter.ts            # Twitter/X（可选，含质量过滤）
│   ├── hackernews.ts         # Hacker News Algolia API
│   ├── github.ts             # GitHub Trending 爬虫
│   ├── reddit.ts             # Reddit JSON API（AI子版块，并行请求）
│   ├── devto.ts              # Dev.to 官方 API
│   ├── googlenews.ts         # Google News RSS（中英双语，并行请求）
│   ├── websearch.ts          # Bing 搜索爬虫
│   ├── baidu.ts              # 百度搜索爬虫（国内）
│   ├── bilibili.ts           # B站公开 API（含 UP主 账号模式）
│   ├── technews.ts           # 36氪 + 少数派 RSS（国内科技媒体）
│   └── index.ts              # 聚合入口（10源并行 + 时间过滤 + URL去重）
├── server/src/lib/
│   ├── scheduler.ts          # 定时任务（监控15min，热点1h）
│   ├── openrouter.ts         # AI：query expansion、verify、热度评分
│   ├── keyword-match.ts      # 扩展短语本地预筛
│   ├── monitor-thresholds.ts # minRelevance 默认值
│   └── email.ts              # 邮件通知
├── server/src/eval-verify.ts   # 相关性审核回归（本地 / --ai）
├── server/src/test-sources.ts  # 数据源可用性测试脚本
└── client/src/               # React 前端（深色玻璃拟态 UI）
```

## 常用命令

```bash
npm run dev          # 启动前后端开发服务器
npm run db:push      # 同步数据库 Schema
npm run db:studio    # 打开 Prisma Studio 查看数据
npm run build        # 构建前端生产包

# 测试所有数据源是否正常（在 server/ 目录下运行）
npx tsx src/test-sources.ts "Claude"
npx tsx src/test-sources.ts "大模型"

# 相关性审核回归（在 server/ 目录下运行）
npm run eval:verify        # 仅本地规则，不消耗 API
npm run eval:verify:ai     # 含真实 AI 调用，需配置 Key
```

# HotMonitor 🔥 AI 热点监控系统

> 自动监控 AI 领域热点，第一时间获取大模型更新、AI 编程工具发布等重要资讯

## 功能特性

| 功能 | 描述 |
|------|------|
| 关键词监控 | 添加关键词，AI 验证真实性后推送通知 |
| 热点发现 | 自动聚合多源热点，AI 打热度分（0-10） |
| 通知中心 | 站内通知历史，支持邮件推送 |
| 7 大数据源 | Twitter · HN · GitHub · Reddit · Dev.to · Google News · Bing |
| AI 过滤 | 基于 OpenRouter/EasyRouter，自动过滤营销/噪音内容 |

## 数据源

| 来源 | 类型 | 成本 | 说明 |
|------|------|------|------|
| Twitter/X | 付费 API | $0.15/1k tweets | 可选，需 twitterapi.io Key；已内置高质量过滤（min_faves:10, -is:reply） |
| Hacker News | 免费 API | 免费 | Algolia 搜索，英文技术社区 |
| GitHub Trending | 爬虫 | 免费 | 每日 Trending 仓库 |
| Reddit | 免费 JSON API | 免费 | LocalLLaMA / MachineLearning / ChatGPT 等7个 AI 子版块 |
| Dev.to | 免费官方 API | 免费 | 开发者技术文章，按 AI 标签聚合 |
| Google News RSS | 免费 RSS | 免费 | 中英文科技新闻，双语同时检索 |
| Bing 搜索 | 爬虫 | 免费 | 网页搜索兜底 |

> Twitter 为可选项，其余 6 个源均无需 API Key，开箱即用。

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example server/.env
```

编辑 `server/.env`，填入配置：

```env
# AI 服务（二选一）
EASYROUTER_API_KEY=sk-...        # 推荐，国内稳定，https://easyrouter.io
OPENROUTER_API_KEY=sk-or-...     # 备用，https://openrouter.ai

# 可选：Twitter 数据源（不填则跳过 Twitter，其余6个源照常工作）
TWITTERAPI_IO_KEY=...            # https://twitterapi.io

# 可选：邮件通知（QQ 邮箱示例）
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=your@qq.com
SMTP_PASS=your-authorization-code
NOTIFY_EMAIL_TO=your@qq.com
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

## 技术栈

- **后端**：Express.js + TypeScript + Prisma + SQLite
- **前端**：React + Vite + TypeScript + Tailwind CSS + Framer Motion
- **AI**：EasyRouter / OpenRouter（默认模型 Gemini 2.5 Flash）
- **实时通知**：Socket.IO + 邮件（Nodemailer）

## 项目结构

```
hot-monitor/
├── server/src/lib/sources/   # 数据源适配器
│   ├── twitter.ts            # Twitter/X（可选，含质量过滤）
│   ├── hackernews.ts         # Hacker News Algolia API
│   ├── github.ts             # GitHub Trending 爬虫
│   ├── reddit.ts             # Reddit JSON API（7个AI子版块）
│   ├── devto.ts              # Dev.to 官方 API
│   ├── googlenews.ts         # Google News RSS（中英双语）
│   ├── websearch.ts          # Bing 搜索爬虫
│   └── index.ts              # 聚合入口（7源并行）
├── server/src/lib/
│   ├── scheduler.ts          # 定时任务（监控15min，热点1h）
│   ├── openrouter.ts         # AI 验证 & 热度评分
│   └── email.ts              # 邮件通知
└── client/src/               # React 前端（深色玻璃拟态 UI）
```

## 常用命令

```bash
npm run dev          # 启动前后端开发服务器
npm run db:push      # 同步数据库 Schema
npm run db:studio    # 打开 Prisma Studio 查看数据
npm run build        # 构建前端生产包
```

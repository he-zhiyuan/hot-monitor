# HotMonitor 🔥 AI 热点监控系统

> 自动监控 AI 领域热点，第一时间获取大模型更新、AI 编程工具发布等重要资讯

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example server/.env
```

编辑 `server/.env`，填入你的 API 密钥：

```env
OPENROUTER_API_KEY=sk-or-...        # 必填，在 openrouter.ai 申请
TWITTERAPI_IO_KEY=...               # 可选，在 twitterapi.io 申请
SMTP_HOST=smtp.gmail.com            # 可选，用于邮件通知
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
NOTIFY_EMAIL_TO=your@gmail.com
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

## 功能

| 功能 | 描述 |
|------|------|
| 关键词监控 | 添加关键词，AI 验证真实性后推送通知 |
| 热点发现 | 自动聚合多源热点，AI 打热度分 |
| 通知中心 | 站内通知历史，支持邮件推送 |
| 多数据源 | Twitter/X + Hacker News + GitHub Trending + 网页搜索 |

## 数据源

- **Twitter/X**：通过 twitterapi.io 搜索推文
- **Hacker News**：通过 Algolia 免费 API 搜索
- **GitHub Trending**：爬取每日 Trending 仓库
- **网页搜索**：通过 DuckDuckGo 搜索

## 技术栈

- **后端**：Express.js + TypeScript + Prisma + SQLite
- **前端**：React + Vite + TypeScript + Tailwind CSS
- **AI**：OpenRouter（支持多模型，默认 Gemini Flash）

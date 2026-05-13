# HotMonitor - 技术架构文档

**版本**：v1.1  
**更新**：2026-05-13

---

## 一、技术选型

### 后端（server/）

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 框架 | Express.js | 4.x | Node.js Web 框架 |
| 语言 | TypeScript | 5.x | 类型安全 |
| ORM | Prisma | 5.x | 类型安全数据库访问 |
| 数据库 | SQLite | - | 轻量级，本地文件存储 |
| AI 服务 | EasyRouter / OpenRouter | - | OpenAI 兼容格式，默认 Gemini 2.5 Flash |
| 调度器 | node-cron | 3.x | 定时任务 |
| 邮件 | Nodemailer | 6.x | SMTP 邮件发送 |
| 实时推送 | Socket.IO | 4.x | WebSocket 站内通知 |
| HTML/XML 解析 | cheerio | 1.x | 爬虫 & RSS 解析 |
| 运行时 | tsx | - | TypeScript 直接运行 |

### 前端（client/）

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 构建工具 | Vite | 5.x | 极速前端构建 |
| 框架 | React | 18.x | UI 框架 |
| 语言 | TypeScript | 5.x | 类型安全 |
| 样式 | Tailwind CSS | 3.x | 原子化 CSS |
| 动效 | Framer Motion | 11.x | 流畅动画 |
| 路由 | React Router | 6.x | 客户端路由 |
| 状态管理 | Zustand | 4.x | 轻量状态管理 |
| HTTP 客户端 | axios | 1.x | API 请求封装 |
| 实时通信 | Socket.IO Client | 4.x | 接收 WebSocket 推送 |
| 图标 | Lucide React | latest | SVG 图标库 |

---

## 二、数据源

| 来源 | 类型 | 访问方式 | 成本 | 适用功能 |
|------|------|---------|------|---------|
| Twitter/X (twitterapi.io) | 第三方 API | REST + `X-API-Key` | $0.15/1k tweets | 关键词监控、热点发现（可选） |
| Hacker News (Algolia) | 官方免费 API | REST，无需 Key | 免费 | 关键词监控、热点发现 |
| GitHub Trending | 爬虫 | cheerio 解析 HTML | 免费 | 热点发现 |
| Reddit | 免费 JSON API | REST，无需 Key | 免费 | 关键词监控、热点发现 |
| Dev.to | 官方免费 API | REST，无需 Key | 免费 | 关键词监控、热点发现 |
| Google News RSS | RSS Feed | cheerio 解析 XML | 免费 | 关键词监控、热点发现 |
| Bing 搜索 | 爬虫 | cheerio 解析 HTML | 免费 | 关键词监控补充 |

### Twitter/X 接入（可选）

```
GET https://api.twitterapi.io/twitter/tweet/advanced_search
Headers: X-API-Key: {TWITTERAPI_IO_KEY}
Params:
  - query: "{keyword} -is:reply min_faves:10 since_time:{ts} until_time:{ts}"
  - queryType: "Latest" | "Top"
质量过滤：
  - API 层：-is:reply（过滤回复）+ min_faves:10（过滤低互动）
  - 本地层：综合互动分（likes + retweets×2）>= 5，且文本不以 @ 开头
```

### Hacker News Algolia API

```
GET http://hn.algolia.com/api/v1/search_by_date
Params:
  - query: string
  - tags: story
  - numericFilters: created_at_i>={timestamp}
  - hitsPerPage: 20
热点发现额外过滤：points>10, num_comments>5
```

### Reddit JSON API

```
GET https://www.reddit.com/r/{subreddit}/search.json   （关键词搜索）
GET https://www.reddit.com/r/{subreddit}/hot.json       （热点发现）
监控子版块：LocalLLaMA / MachineLearning / ChatGPT / ClaudeAI / artificial / programming / singularity
过滤条件：score >= 5（搜索）/ score >= 10（热点）
速率限制：请求间隔 1.1s，遵守 Reddit API 规范
```

### Dev.to API

```
GET https://dev.to/api/articles
Params:
  - tag: ai | machinelearning | llm | deeplearning | chatgpt | python
  - per_page: 30
  - state: fresh（搜索）| top=1（热点，当天最热）
```

### Google News RSS

```
GET https://news.google.com/rss/search?q={query}&hl={lang}&gl={country}&ceid={ceid}
同时请求中文（zh-CN）和英文（en-US）两个 Feed，URL 去重后合并
使用 cheerio xmlMode 解析 RSS XML，提取 title/link/description/pubDate
```

### GitHub Trending 爬虫

```
GET https://github.com/trending?since=daily
解析：cheerio 提取 article.Box-row 中的仓库信息
字段：repoName, description, language, stars, todayStars
```

---

## 三、项目结构

```
hot-monitor/
├── docs/                         # 文档目录
│   ├── PRD.md
│   └── ARCHITECTURE.md
├── server/                       # Express.js 后端
│   ├── src/
│   │   ├── routes/               # API 路由
│   │   │   ├── monitors.ts       # GET/POST/PUT/DELETE /api/monitors
│   │   │   ├── hotspots.ts       # GET /api/hotspots, POST /api/hotspots/refresh
│   │   │   ├── notifications.ts  # GET/PATCH /api/notifications
│   │   │   ├── scan.ts           # POST /api/scan (手动触发扫描)
│   │   │   └── settings.ts       # GET/PUT /api/settings
│   │   ├── lib/
│   │   │   ├── prisma.ts         # Prisma 客户端单例
│   │   │   ├── openrouter.ts     # AI 客户端（EasyRouter/OpenRouter）
│   │   │   ├── scheduler.ts      # node-cron 调度器
│   │   │   ├── email.ts          # Nodemailer 邮件发送
│   │   │   ├── socket.ts         # Socket.IO 实时推送
│   │   │   └── sources/          # 数据源适配器（7个）
│   │   │       ├── index.ts      # 聚合入口（7源并行 + URL去重）
│   │   │       ├── twitter.ts    # Twitter/X（含质量过滤）
│   │   │       ├── hackernews.ts # HN Algolia API
│   │   │       ├── github.ts     # GitHub Trending 爬虫
│   │   │       ├── reddit.ts     # Reddit JSON API（7个AI子版块）
│   │   │       ├── devto.ts      # Dev.to 官方 API
│   │   │       ├── googlenews.ts # Google News RSS（中英双语）
│   │   │       └── websearch.ts  # Bing 搜索爬虫
│   │   └── index.ts              # Express 应用入口
│   ├── prisma/
│   │   ├── schema.prisma         # 数据库结构
│   │   └── dev.db                # SQLite 数据库文件
│   ├── package.json
│   └── tsconfig.json
├── client/                       # React + Vite 前端
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx     # 主仪表板（热点总览）
│   │   │   ├── Monitors.tsx      # 关键词监控管理
│   │   │   ├── Hotspots.tsx      # 热点发现列表
│   │   │   ├── Notifications.tsx # 通知中心
│   │   │   └── Settings.tsx      # 系统设置
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── TopBar.tsx
│   │   │   ├── monitors/
│   │   │   │   ├── MonitorCard.tsx
│   │   │   │   └── AddMonitorModal.tsx
│   │   │   ├── hotspots/
│   │   │   │   └── HotspotCard.tsx   # 支持7种来源标签
│   │   │   └── ui/
│   │   │       └── Badge.tsx         # 支持 cyan/green/amber/red/purple/blue/gray
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── store/
│   │   └── types/
│   ├── index.html
│   ├── vite.config.ts
│   └── tailwind.config.js
├── .env.example                  # 环境变量示例
└── package.json                  # 根 package（启动脚本）
```

---

## 四、数据库 Schema

```prisma
// Monitor: 关键词监控任务
model Monitor {
  id          String   @id @default(cuid())
  keyword     String
  description String?
  isActive    Boolean  @default(true)
  interval    Int      @default(15)         // 检查频率（分钟）
  lastChecked DateTime?
  createdAt   DateTime @default(now())
  findings    Finding[]
}

// Finding: 监控发现的内容
model Finding {
  id          String   @id @default(cuid())
  monitorId   String
  monitor     Monitor  @relation(fields: [monitorId], references: [id])
  title       String
  content     String   @db.Text
  url         String
  source      String   // twitter/hackernews/github/reddit/devto/googlenews/web
  author      String?
  publishedAt DateTime?
  aiScore     Float                         // AI 相关性评分 0-1（-1 表示 AI 调用失败）
  aiSummary   String   @db.Text
  isNotified  Boolean  @default(false)
  createdAt   DateTime @default(now())
}

// HotSpot: 热点发现条目
model HotSpot {
  id          String   @id @default(cuid())
  title       String
  summary     String   @db.Text
  url         String
  source      String   // twitter/hackernews/github/reddit/devto/googlenews/web
  author      String?
  domain      String
  heatScore   Float    @default(0)          // AI 热度分（0-10）
  sourceCount Int      @default(1)
  isRead      Boolean  @default(false)
  isSaved     Boolean  @default(false)
  publishedAt DateTime?
  createdAt   DateTime @default(now())
}

// Notification: 通知记录
model Notification {
  id        String   @id @default(cuid())
  title     String
  body      String   @db.Text
  type      String                          // monitor/hotspot/system
  refId     String?
  url       String?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
}

// Setting: 系统配置（KV 存储）
model Setting {
  key       String @id
  value     String @db.Text
  updatedAt DateTime @updatedAt
}
```

---

## 五、核心流程

### 5.1 关键词监控流程

```
[node-cron 每15分钟]
  → 遍历所有 isActive=true 的 Monitor
  → 对每个 Monitor:
      ① 7个数据源并行搜索关键词
         Twitter / HN / GitHub / Reddit / Dev.to / Google News / Bing
      ② 过滤已处理 URL（对比数据库）
      ③ 调用 AI 验证内容真实性（每次调用前等待5s防限流）
         - 返回: { isReal: bool, relevance: float, summary: string }
      ④ relevance > 0.5 → 保存 Finding → 创建 Notification
      ⑤ 防重复通知：同一 URL 24h 内只推送一次
      ⑥ 发送 Socket.IO 实时推送 + 邮件通知
  → 更新 Monitor.lastChecked
```

### 5.2 热点发现流程

```
[node-cron 每1小时]
  → 读取配置的领域列表（Setting: discovery_domains）
  → 对每个领域:
      ① 7个数据源并行聚合内容
      ② URL 去重，合并同一事件的多条记录
      ③ 调用 AI 批量评分（每批最多5条）
         - 输出: heatScore(0-10) + 改写摘要
      ④ heatScore >= 3 的条目保存到 HotSpot 表
      ⑤ 清理 7 天前的旧数据
```

### 5.3 Twitter 质量过滤策略

```
API 层（twitterapi.io 查询参数）：
  - -is:reply          过滤纯回复推文
  - min_faves:10       要求至少10个点赞（关键词监控）
  - min_faves:10       热点发现同样标准

本地二次过滤：
  - 文本以 @ 开头的推文丢弃（漏网的回复）
  - 综合互动分 = likes + retweets×2 < 5 的丢弃
```

### 5.4 AI 提示词设计

**关键词验证 Prompt**：
```
你是一个新闻真实性分析器。给定以下内容，判断：
1. 这是否是关于 "{keyword}" 的真实新闻/发布/更新（而非营销、转载、猜测）？
2. 与关键词的相关度（0-1）
3. 用一句话总结核心信息

内容：{title}\n{content}

返回 JSON：{"isReal": bool, "relevance": float, "summary": "..."}
```

**热度评分 Prompt**：
```
你是一个科技热点分析器。以下是从 AI/编程领域收集的内容列表，
请为每条内容打热度分（0-10），10分代表重大突破/发布。

评分依据：
- 重要程度（模型发布 > 功能更新 > 工具发布 > 讨论）
- 影响范围（行业级 > 产品级 > 工具级）

内容列表（JSON）：{items}
返回 JSON 数组：[{"id": "...", "score": float, "summary": "..."}]
```

---

## 六、环境变量

```env
# 数据库
DATABASE_URL="file:./prisma/dev.db"

# AI 服务（二选一，优先使用 EasyRouter）
EASYROUTER_API_KEY="sk-your-easyrouter-key"
OPENROUTER_API_KEY="sk-or-your-key"

# 可选模型覆盖（默认 gemini-2.5-flash）
# EASYROUTER_MODEL="gpt-4o-mini"

# Twitter（可选，不填则跳过 Twitter 源）
TWITTERAPI_IO_KEY="your-twitterapi-io-key"

# 邮件通知（SMTP，可选）
SMTP_HOST="smtp.qq.com"
SMTP_PORT="587"
SMTP_USER="your@qq.com"
SMTP_PASS="your-authorization-code"
NOTIFY_EMAIL_TO="your@qq.com"

# 服务端口
PORT=3001

# 前端地址（用于 CORS）
CLIENT_URL="http://localhost:5173"
```

---

## 七、UI 设计规范

### 风格：深色玻璃拟态 + 霓虹渐变

- **背景**：`#080c14`（极深蓝黑）
- **卡片**：`rgba(255,255,255,0.04)` + `backdrop-blur-xl` + `border: rgba(255,255,255,0.08)`
- **主色调**：紫色渐变 `#7c3aed → #4f46e5`
- **强调色**：青色 `#06b6d4`
- **成功**：`#10b981`（绿色）
- **警告**：`#f59e0b`（琥珀）
- **字体**：`Inter`（正文）+ `JetBrains Mono`（代码/数据）

### 来源标签配色

| 来源 | Badge 颜色 | 说明 |
|------|-----------|------|
| Twitter/X | cyan | 蓝绿色 |
| Hacker News | amber | 琥珀橙 |
| GitHub | green | 翠绿色 |
| Reddit | red | 红色（品牌色） |
| Dev.to | purple | 紫色（品牌色） |
| Google News | blue | 蓝色 |
| Web/Bing | gray | 中性灰 |

### 布局

- **桌面**：左侧固定侧边栏（240px）+ 右侧主内容区
- **移动**：底部导航栏 + 全屏内容区

### 核心动效

- 卡片 hover：`scale(1.01)` + 边框发光（box-shadow: 0 0 20px rgba(124,58,237,0.3)）
- 热点评分：环形进度计（HeatGauge）按分值变色（红/琥珀/青/灰）
- 通知 badge：脉冲光圈动画
- 新数据载入：从下方渐入（`translateY(10px) → 0`，300ms）

---

## 八、开发里程碑

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 项目初始化、DB Schema、基础 API | ✅ 完成 |
| Phase 2 | 数据源适配器（HN + Twitter + GitHub + Bing） | ✅ 完成 |
| Phase 3 | AI 集成（EasyRouter/OpenRouter） | ✅ 完成 |
| Phase 4 | 定时任务调度器 | ✅ 完成 |
| Phase 5 | 前端 UI 开发（深色玻璃拟态） | ✅ 完成 |
| Phase 6 | 通知系统（Socket.IO + 邮件） | ✅ 完成 |
| Phase 7 | 多源扩展（Reddit + Dev.to + Google News）+ Twitter 质量过滤 | ✅ 完成 |
| Phase 8 | Agent Skills 封装 | 待定 |

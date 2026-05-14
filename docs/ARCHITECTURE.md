# HotMonitor - 技术架构文档

**版本**：v1.2  
**更新**：2026-05-14

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

| 来源 | 类型 | 成本 | 国内可用 | 适用功能 |
|------|------|------|---------|---------|
| Twitter/X (twitterapi.io) | 第三方 API | $0.15/1k | ✅ | 关键词监控、热点发现（可选） |
| Hacker News (Algolia) | 官方免费 API | 免费 | ✅ | 关键词监控、热点发现 |
| GitHub Trending | 爬虫 | 免费 | ✅ | 热点发现 |
| Reddit | 免费 JSON API | 免费 | ❌ 超时 | 关键词监控、热点发现 |
| Dev.to | 官方免费 API | 免费 | ✅ | 关键词监控、热点发现 |
| Google News RSS | RSS Feed | 免费 | ❌ 超时 | 关键词监控、热点发现 |
| Bing 搜索 | 爬虫 | 免费 | ✅ | 关键词监控补充 |
| 百度搜索 | 爬虫 | 免费 | ✅ | 关键词监控（中文内容） |
| B站 Bilibili | 公开 JSON API | 免费 | ✅ | 关键词监控、账号监控 |
| 36氪 + 少数派 | RSS Feed | 免费 | ✅ | 关键词监控、热点发现 |

> Reddit 和 Google News 在国内网络下超时，已设置并行请求 + 8s 超时上限，超时不阻塞其他源。

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
  - numericFilters: created_at_i>={timestamp}（默认48h）
  - hitsPerPage: 20
热点发现额外过滤：points>10, num_comments>5
```

### Reddit JSON API（国内网络可能超时）

```
GET https://www.reddit.com/r/{subreddit}/search.json   （关键词搜索）
GET https://www.reddit.com/r/{subreddit}/hot.json       （热点发现）
监控子版块：LocalLLaMA / MachineLearning / ChatGPT / ClaudeAI / artificial / programming / singularity
过滤条件：score >= 5（搜索）/ score >= 10（热点）
时间窗口：t=day（搜索）/ created_utc >= 48h（热点）
并发策略：多子版块并行请求，单个超时 8s 不阻塞其他
```

### Dev.to API

```
GET https://dev.to/api/articles
Params:
  - tag: ai | machinelearning | llm | deeplearning | chatgpt | python
  - per_page: 30
  - state: fresh（搜索）| top=1（热点，当天最热）
```

### Google News RSS（国内网络可能超时）

```
GET https://news.google.com/rss/search?q={query}&hl={lang}&gl={country}&ceid={ceid}
并行请求中文（zh-CN）和英文（en-US）两个 Feed，单个超时 8s，URL 去重后合并
```

### GitHub Trending 爬虫

```
GET https://github.com/trending?since=daily
解析：cheerio 提取 article.Box-row 中的仓库信息
字段：repoName, description, language, stars, todayStars
```

### 百度搜索爬虫（国内）

```
GET https://www.baidu.com/s?wd={query}&rn=10
解析：cheerio 提取 #content_left .result 中的标题和摘要
特点：国内直连，publishedAt 设为当前时间（无法从搜索结果获取原文发布时间）
```

### B站 Bilibili 公开 API

```
# 普通搜索模式
GET https://api.bilibili.com/x/web-interface/search/type
Params: search_type=video, keyword={keyword}, order=pubdate
过滤：只保留 7 天内发布的视频

# 账号模式（关键词以 @ 开头）
Step 1: GET .../search/type?search_type=bili_user&keyword={username}   → 获取 UP主 mid
Step 2: GET https://api.bilibili.com/x/space/arc/search?mid={mid}&ps=10&order=pubdate
→ 直接获取该 UP主 最新10条投稿
```

### 36氪 + 少数派 RSS（国内）

```
GET https://36kr.com/feed    （36氪）
GET https://sspai.com/feed   （少数派）
两个 Feed 并行请求，使用 cheerio xmlMode 解析
时间过滤：pubDate 超过 48h（搜索）/ 72h（热点发现）的文章丢弃
```

---

## 三、项目结构

```
hot-monitor/
├── docs/
│   ├── PRD.md
│   └── ARCHITECTURE.md
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── monitors.ts       # GET/POST/PUT/DELETE /api/monitors
│   │   │   ├── hotspots.ts       # GET /api/hotspots, POST /api/hotspots/refresh
│   │   │   ├── notifications.ts  # GET/PATCH /api/notifications
│   │   │   ├── scan.ts           # POST /api/scan (手动触发扫描)
│   │   │   └── settings.ts       # GET/PUT /api/settings
│   │   ├── lib/
│   │   │   ├── prisma.ts
│   │   │   ├── openrouter.ts     # AI 客户端（EasyRouter/OpenRouter）
│   │   │   ├── scheduler.ts      # node-cron 调度器
│   │   │   ├── email.ts          # Nodemailer 邮件发送
│   │   │   ├── socket.ts         # Socket.IO 实时推送
│   │   │   └── sources/          # 数据源适配器（10个）
│   │   │       ├── index.ts      # 聚合入口（10源并行 + 时间过滤 + URL去重）
│   │   │       ├── twitter.ts    # Twitter/X（含质量过滤）
│   │   │       ├── hackernews.ts # HN Algolia API
│   │   │       ├── github.ts     # GitHub Trending 爬虫
│   │   │       ├── reddit.ts     # Reddit JSON API（并行，8s超时）
│   │   │       ├── devto.ts      # Dev.to 官方 API
│   │   │       ├── googlenews.ts # Google News RSS（并行，8s超时）
│   │   │       ├── websearch.ts  # Bing 搜索爬虫
│   │   │       ├── baidu.ts      # 百度搜索爬虫
│   │   │       ├── bilibili.ts   # B站公开 API（含 UP主 账号模式）
│   │   │       └── technews.ts   # 36氪 + 少数派 RSS
│   │   ├── test-sources.ts       # 数据源可用性测试脚本
│   │   └── index.ts              # Express 应用入口
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── dev.db
│   ├── package.json
│   └── tsconfig.json
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Monitors.tsx
│   │   │   ├── Hotspots.tsx
│   │   │   ├── Notifications.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── TopBar.tsx
│   │   │   ├── monitors/
│   │   │   │   ├── MonitorCard.tsx
│   │   │   │   └── AddMonitorModal.tsx
│   │   │   ├── hotspots/
│   │   │   │   └── HotspotCard.tsx   # 支持11种来源标签
│   │   │   └── ui/
│   │   │       └── Badge.tsx         # cyan/green/amber/red/purple/blue/pink/gray/ghost
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── store/
│   │   └── types/
│   └── ...
├── .env.example
└── package.json
```

---

## 四、数据库 Schema

```prisma
// Monitor: 关键词监控任务
model Monitor {
  id          String   @id @default(cuid())
  keyword     String                        // 支持 @ 前缀的账号模式
  description String?
  isActive    Boolean  @default(true)
  interval    Int      @default(15)
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
  source      String   // twitter/hackernews/github/reddit/devto/googlenews/web/baidu/bilibili/36kr/sspai
  author      String?
  publishedAt DateTime?
  aiScore     Float                         // 0-1（-1 表示 AI 调用失败）
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
  source      String   // 同上
  author      String?
  domain      String
  heatScore   Float    @default(0)
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
  type      String
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
      ① 检测是否为账号模式（keyword 以 @ 开头）
         - 账号模式：B站直接拉 UP主 主页 + Twitter 精确匹配 handle
         - 普通模式：10个源并行搜索关键词
      ② 全局时间过滤：丢弃 publishedAt 超过 48h 的条目
      ③ 过滤已处理 URL（对比数据库）
      ④ 调用 AI 验证内容真实性（每次调用前等待5s防限流）
         - 返回: { isReal: bool, relevance: float, summary: string }
      ⑤ relevance > 0.5 → 保存 Finding → 创建 Notification
      ⑥ 防重复通知：同一 URL 24h 内只推送一次
      ⑦ 发送 Socket.IO 实时推送 + 邮件通知
  → 更新 Monitor.lastChecked
```

### 5.2 热点发现流程

```
[node-cron 每1小时]
  → 读取配置的领域列表（Setting: discovery_domains）
  → 对每个领域:
      ① 10个数据源并行聚合内容
      ② 全局时间过滤：丢弃 publishedAt 超过 72h 的条目
      ③ URL 去重，合并同一事件的多条记录
      ④ 调用 AI 批量评分（每批最多5条）
         - 输出: heatScore(0-10) + 改写摘要
      ⑤ heatScore >= 3 的条目保存到 HotSpot 表
      ⑥ 清理 7 天前的旧数据
```

### 5.3 全局时间新鲜度过滤（filterRecent）

```
对 aggregateSearch 和 aggregateTrending 的所有返回结果统一处理：

保留条件（满足任一）：
  - publishedAt 不存在或无效
  - publishedAt 距当前 < 60s（Baidu/Bing 等使用 new Date() 占位，日期未知）
  - publishedAt 在阈值时间内（搜索48h / 热点72h）

丢弃条件：
  - publishedAt 是真实日期，且超过阈值
```

### 5.4 账号监控模式

```
触发条件：关键词以 @ 开头，如 @宝玉、@OpenAI

行为差异：
  普通搜索                              账号模式
  ─────────────────────────────────────────────────────
  searchBilibili(keyword)         →  searchBilibiliUser(username)
                                      Step1: 搜索 UP主 → 获取 mid
                                      Step2: 拉取最新10条投稿

  searchTwitter(keyword, 6h)      →  searchTwitter("@username", 6h)
                                      精确匹配 handle

  其他源：使用去掉 @ 后的账号名作为关键词正常搜索
```

### 5.5 Twitter 质量过滤策略

```
API 层（twitterapi.io 查询参数）：
  - -is:reply          过滤纯回复推文
  - min_faves:10       要求至少10个点赞

本地二次过滤：
  - 文本以 @ 开头的推文丢弃（漏网的回复）
  - 综合互动分 = likes + retweets×2 < 5 的丢弃
```

### 5.6 AI 提示词设计

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
- **字体**：`Inter`（正文）+ `JetBrains Mono`（代码/数据）

### 来源标签配色（11种）

| 来源 | Badge 变体 | 说明 |
|------|-----------|------|
| Twitter/X | `cyan` | 蓝绿色 |
| Hacker News | `amber` | 琥珀橙 |
| GitHub | `green` | 翠绿色 |
| Reddit | `red` | 红色（品牌色） |
| Dev.to | `purple` | 紫色（品牌色） |
| Google News | `blue` | 蓝色 |
| Web/Bing | `gray` | 中性灰 |
| B站 Bilibili | `pink` | 粉色（品牌色） |
| 百度 | `blue` | 蓝色 |
| 36氪 | `green` | 绿色 |
| 少数派 | `amber` | 琥珀色 |

### 布局

- **桌面**：左侧固定侧边栏（240px）+ 右侧主内容区
- **移动**：底部导航栏 + 全屏内容区

---

## 八、开发工具

### 数据源测试脚本

```bash
# 在 server/ 目录下运行
npx tsx src/test-sources.ts "Claude"    # 测试英文关键词
npx tsx src/test-sources.ts "大模型"    # 测试中文关键词
npx tsx src/test-sources.ts "@宝玉"     # 测试账号模式
```

输出内容：每个源的返回条数、响应时间、最新内容时间、前3条标题预览、失败原因。

---

## 九、开发里程碑

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 项目初始化、DB Schema、基础 API | ✅ 完成 |
| Phase 2 | 数据源适配器（HN + Twitter + GitHub + Bing） | ✅ 完成 |
| Phase 3 | AI 集成（EasyRouter/OpenRouter） | ✅ 完成 |
| Phase 4 | 定时任务调度器 | ✅ 完成 |
| Phase 5 | 前端 UI 开发（深色玻璃拟态） | ✅ 完成 |
| Phase 6 | 通知系统（Socket.IO + 邮件） | ✅ 完成 |
| Phase 7 | 多源扩展（Reddit + Dev.to + Google News）+ Twitter 质量过滤 | ✅ 完成 |
| Phase 8 | 国内源扩展（百度 + B站 + 36氪 + 少数派）+ 账号监控模式 | ✅ 完成 |
| Phase 9 | 全局时间新鲜度过滤 + 超时优化 + 数据源测试工具 | ✅ 完成 |
| Phase 10 | Agent Skills 封装 | 待定 |

# HotMonitor - 技术架构文档

**版本**：v1.0  
**日期**：2026-05-10

---

## 一、技术选型

### 后端（server/）

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 框架 | Express.js | 4.x | Node.js Web 框架 |
| 语言 | TypeScript | 5.x | 类型安全 |
| ORM | Prisma | 5.x | 类型安全数据库访问 |
| 数据库 | SQLite | - | 轻量级，本地文件存储 |
| AI 服务 | OpenRouter SDK | 0.12.x | `@openrouter/sdk` |
| 调度器 | node-cron | 3.x | 定时任务 |
| 邮件 | Nodemailer | 6.x | SMTP 邮件发送 |
| HTML 解析 | cheerio | 1.x | 爬虫 HTML 解析 |
| 运行时 | tsx / ts-node | - | TypeScript 直接运行 |

### 前端（client/）

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 构建工具 | Vite | 5.x | 极速前端构建 |
| 框架 | React | 18.x | UI 框架 |
| 语言 | TypeScript | 5.x | 类型安全 |
| 样式 | Tailwind CSS | 3.x | 原子化 CSS |
| UI 组件 | shadcn/ui | latest | 无样式组件库 |
| 路由 | React Router | 6.x | 客户端路由 |
| 状态管理 | Zustand | 4.x | 轻量状态管理 |
| HTTP 客户端 | axios | 1.x | API 请求封装 |
| 图标 | Lucide React | latest | SVG 图标库 |

---

## 二、数据源

| 来源 | 类型 | 访问方式 | 成本 | 适用功能 |
|------|------|---------|------|---------|
| TwitterAPI.io | 第三方 API | REST + `X-API-Key` 头 | $0.15/1k tweets | 关键词监控、热点发现 |
| Hacker News (Algolia) | 官方免费 API | REST，无需 Key | 免费 | 关键词监控、热点发现 |
| GitHub Trending | 爬虫 | cheerio 解析 HTML | 免费 | 热点发现 |
| Google 搜索 | 爬虫 | 抓取搜索结果页 | 免费（限频） | 关键词监控补充 |

### TwitterAPI.io 接入

```
GET https://api.twitterapi.io/twitter/tweet/advanced_search
Headers: X-API-Key: {TWITTERAPI_IO_KEY}
Params:
  - query: string  (支持高级语法，如 "Claude 5" lang:zh OR lang:en)
  - queryType: "Latest" | "Top"
  - cursor: string (分页，避免使用，改用时间窗口)
响应: { tweets: Tweet[], has_next_page: boolean, next_cursor: string }
注意: 每页最多 20 条，使用 since_time/until_time 控制范围
```

### Hacker News Algolia API

```
GET http://hn.algolia.com/api/v1/search_by_date
Params:
  - query: string
  - tags: story
  - numericFilters: created_at_i>={timestamp}
  - hitsPerPage: 20
响应: { hits: HNHit[], nbHits: number }
```

### GitHub Trending 爬虫

```
GET https://github.com/trending?since=daily&spoken_language_code=zh
解析: cheerio 提取 article.Box-row 中的仓库信息
字段: repoName, description, language, stars, forks, todayStars
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
│   │   │   ├── openrouter.ts     # OpenRouter AI 客户端
│   │   │   ├── scheduler.ts      # node-cron 调度器
│   │   │   ├── email.ts          # Nodemailer 邮件发送
│   │   │   └── sources/          # 数据源适配器
│   │   │       ├── index.ts      # 聚合入口
│   │   │       ├── twitter.ts    # TwitterAPI.io
│   │   │       ├── hackernews.ts # HN Algolia API
│   │   │       ├── github.ts     # GitHub Trending 爬虫
│   │   │       └── websearch.ts  # DuckDuckGo 网页搜索
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
│   │   │   │   └── HotspotCard.tsx
│   │   │   └── ui/               # 基础 UI 组件
│   │   ├── hooks/
│   │   │   ├── useMonitors.ts
│   │   │   ├── useHotspots.ts
│   │   │   └── useNotifications.ts
│   │   ├── lib/
│   │   │   └── api.ts            # axios 封装
│   │   ├── store/
│   │   │   └── index.ts          # Zustand 全局状态
│   │   ├── types/
│   │   │   └── index.ts          # 前端类型定义
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
├── .env.example                  # 环境变量示例（服务端）
└── package.json                  # 根 package（启动脚本）
```

---

## 四、数据库 Schema

```prisma
// Monitor: 关键词监控任务
model Monitor {
  id          String   @id @default(cuid())
  keyword     String                        // 监控关键词
  description String?                       // 说明
  isActive    Boolean  @default(true)       // 是否启用
  interval    Int      @default(15)         // 检查频率（分钟）
  lastChecked DateTime?                     // 上次检查时间
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
  source      String                        // twitter/hackernews/github/web
  author      String?
  publishedAt DateTime?
  aiScore     Float                         // AI 相关性评分 0-1
  aiSummary   String   @db.Text            // AI 生成的摘要
  isNotified  Boolean  @default(false)     // 是否已推送通知
  createdAt   DateTime @default(now())
}

// HotSpot: 热点发现条目
model HotSpot {
  id          String   @id @default(cuid())
  title       String
  summary     String   @db.Text
  url         String
  source      String
  author      String?
  domain      String                        // 所属领域（如"AI编程"）
  heatScore   Float    @default(0)         // 热度分（0-10）
  sourceCount Int      @default(1)         // 多少个来源提到
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
  refId     String?                         // 关联的 Finding/HotSpot ID
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
      ① 从 Twitter/HN/GitHub/Web 并行搜索关键词
      ② 过滤已处理 URL（对比数据库）
      ③ 调用 OpenRouter AI 验证内容真实性
         - 模型: google/gemini-flash-1.5 (快速+低成本)
         - 返回: { isReal: bool, relevance: float, summary: string }
      ④ relevance > 0.7 → 保存 Finding → 创建 Notification
      ⑤ 发送浏览器 Push + 邮件通知
  → 更新 Monitor.lastChecked
```

### 5.2 热点发现流程

```
[node-cron 每1小时]
  → 读取配置的领域列表（Setting: discovery_domains）
  → 对每个领域:
      ① 并行从 Twitter/HN/GitHub 聚合内容
      ② 按 URL 去重，合并同一事件的多条记录
      ③ 调用 OpenRouter AI 批量评分
         - 模型: google/gemini-flash-1.5
         - 输入: 标题+摘要列表
         - 输出: 每条的 heatScore(0-10) + 改写摘要
      ④ heatScore > 5 的条目保存到 HotSpot 表
      ⑤ 清理 7 天前的旧数据
```

### 5.3 AI 提示词设计

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
- 时效性已由系统保证

内容列表（JSON）：{items}
返回 JSON 数组：[{"id": "...", "score": float, "summary": "..."}]
```

---

## 六、环境变量

```env
# 数据库
DATABASE_URL="file:./prisma/dev.db"

# AI 服务
OPENROUTER_API_KEY="sk-or-..."
OPENROUTER_MODEL="google/gemini-flash-1.5"   # 默认模型

# Twitter
TWITTERAPI_IO_KEY="your-twitterapi-io-key"

# 邮件（SMTP）
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your@gmail.com"
SMTP_PASS="your-app-password"
NOTIFY_EMAIL_TO="your@gmail.com"

# Web Push（用 web-push 生成）
VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_EMAIL="mailto:your@gmail.com"

# 应用
NEXT_PUBLIC_APP_URL="http://localhost:3000"
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

### 布局

- **桌面**：左侧固定侧边栏（240px）+ 右侧主内容区
- **移动**：底部导航栏 + 全屏内容区

### 核心动效

- 卡片 hover：`scale(1.01)` + 边框发光（box-shadow: 0 0 20px rgba(124,58,237,0.3)）
- 热点数字：数字滚动动画
- 通知 badge：脉冲光圈动画
- 新数据载入：从下方渐入（`translateY(10px) → 0`，200ms）

---

## 八、开发里程碑

| 阶段 | 内容 | 预计时间 |
|------|------|---------|
| Phase 1 | 项目初始化、DB Schema、基础 API | 完成 |
| Phase 2 | 数据源适配器（HN + Twitter + GitHub） | 完成 |
| Phase 3 | OpenRouter AI 集成 | 完成 |
| Phase 4 | 定时任务调度器 | 完成 |
| Phase 5 | 前端 UI 开发 | 完成 |
| Phase 6 | 通知系统（Push + 邮件） | 完成 |
| Phase 7 | 测试验收 | 待定 |
| Phase 8 | Agent Skills 封装 | 后续 |

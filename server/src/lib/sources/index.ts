import { searchHackerNews, getHNTrending } from './hackernews'
import { searchTwitter, getTwitterTrending } from './twitter'
import { searchGithubTrending, getGithubTrending } from './github'
import { searchWeb } from './websearch'
import { searchReddit, getRedditTrending } from './reddit'
import { searchDevTo, getDevToTrending } from './devto'
import { searchGoogleNews, getGoogleNewsTrending } from './googlenews'
import { searchBaidu } from './baidu'
import { searchBilibili, searchBilibiliUser } from './bilibili'
import { searchTechNews, getTechNewsTrending } from './technews'

export interface SourceItem {
  title: string
  url: string
  content: string
  author: string
  publishedAt: Date
  source: string
  [key: string]: unknown
}

// ── 账号检测 ────────────────────────────────────────────────────────────────

/**
 * 判断关键词是否为 @ 账号模式（如 @宝玉、@OpenAI）
 */
function isAccountKeyword(keyword: string): boolean {
  return keyword.trimStart().startsWith('@')
}

/**
 * 提取账号名（去除 @ 前缀）
 */
function extractAccountName(keyword: string): string {
  return keyword.trimStart().replace(/^@/, '').trim()
}

// ── 工具函数 ─────────────────────────────────────────────────────────────────

function dedup(items: SourceItem[]): SourceItem[] {
  const seen = new Set<string>()
  return items.filter(item => {
    if (!item.url || seen.has(item.url)) return false
    seen.add(item.url)
    return true
  })
}

function collect(
  results: PromiseSettledResult<SourceItem[]>[],
  labels: string[]
): SourceItem[] {
  const items: SourceItem[] = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      items.push(...(r.value as SourceItem[]))
    } else {
      console.warn(`[Sources] ${labels[i]} failed:`, r.reason?.message)
    }
  })
  return items
}

// ── 关键词监控（aggregateSearch）─────────────────────────────────────────────

/**
 * 聚合多源搜索（关键词监控用）
 *
 * 账号模式（关键词以 @ 开头）：
 *   - 普通搜索使用去除 @ 后的账号名
 *   - B站额外调用 UP主 主页 API，直接获取其最新投稿
 *
 * 普通模式：
 *   - 全部11个源并行关键词搜索
 */
export async function aggregateSearch(keyword: string): Promise<SourceItem[]> {
  const isAccount = isAccountKeyword(keyword)
  const cleanName = isAccount ? extractAccountName(keyword) : keyword

  if (isAccount) {
    console.log(`[Sources] Account mode: @${cleanName}`)
  }

  const labels = [
    'HN', 'Twitter', 'GitHub', 'Bing',
    'GoogleNews', 'Reddit', 'DevTo',
    'Baidu', 'Bilibili', 'TechNews',
  ]

  const searches = [
    searchHackerNews(cleanName, 24),
    // Twitter 账号模式保留 @ 以便精确匹配 handle
    searchTwitter(isAccount ? `@${cleanName}` : cleanName, 6),
    searchGithubTrending(cleanName),
    searchWeb(cleanName),
    searchGoogleNews(cleanName),
    searchReddit(cleanName),
    searchDevTo(cleanName),
    searchBaidu(cleanName),
    // B站：账号模式 → 直接拉 UP主 主页；普通模式 → 关键词搜视频
    isAccount ? searchBilibiliUser(cleanName) : searchBilibili(cleanName),
    searchTechNews(cleanName),
  ]

  const results = await Promise.allSettled(searches)
  return dedup(collect(results as PromiseSettledResult<SourceItem[]>[], labels))
}

// ── 热点发现（aggregateTrending）─────────────────────────────────────────────

/**
 * 聚合热点发现（定期自动发现用）
 * 热点发现不涉及账号模式，全部按领域词聚合
 */
export async function aggregateTrending(domain: string): Promise<SourceItem[]> {
  const labels = [
    'HN', 'Twitter', 'GitHub', 'Bing',
    'GoogleNews', 'Reddit', 'DevTo',
    'Baidu', 'Bilibili', 'TechNews',
  ]

  const searches = [
    getHNTrending(domain),
    getTwitterTrending(domain),
    getGithubTrending('', 'daily'),
    searchWeb(`${domain} 最新`),
    getGoogleNewsTrending(domain),
    getRedditTrending(domain),
    getDevToTrending(domain),
    searchBaidu(`${domain} 最新`),
    searchBilibili(domain),
    getTechNewsTrending(),
  ]

  const results = await Promise.allSettled(searches)
  return dedup(collect(results as PromiseSettledResult<SourceItem[]>[], labels))
}

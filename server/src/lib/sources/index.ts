import { searchHackerNews, getHNTrending } from './hackernews'
import { searchTwitter, getTwitterTrending } from './twitter'
import { searchGithubTrending, getGithubTrending } from './github'
import { searchWeb } from './websearch'
import { searchReddit, getRedditTrending } from './reddit'
import { searchDevTo, getDevToTrending } from './devto'
import { searchGoogleNews, getGoogleNewsTrending } from './googlenews'

export interface SourceItem {
  title: string
  url: string
  content: string
  author: string
  publishedAt: Date
  source: string
  [key: string]: unknown
}

function dedup(items: SourceItem[]): SourceItem[] {
  const seen = new Set<string>()
  return items.filter(item => {
    if (!item.url || seen.has(item.url)) return false
    seen.add(item.url)
    return true
  })
}

/**
 * 聚合多源搜索：监控关键词用
 * 数据源：HackerNews / Twitter / GitHub / Bing / Reddit / Dev.to / Google News
 */
export async function aggregateSearch(keyword: string): Promise<SourceItem[]> {
  const results = await Promise.allSettled([
    searchHackerNews(keyword, 24),
    searchTwitter(keyword, 6),
    searchGithubTrending(keyword),
    searchWeb(keyword),
    searchGoogleNews(keyword),
    searchReddit(keyword),
    searchDevTo(keyword),
  ])

  const items: SourceItem[] = []
  results.forEach((r, i) => {
    const labels = ['HN', 'Twitter', 'GitHub', 'Bing', 'GoogleNews', 'Reddit', 'DevTo']
    if (r.status === 'fulfilled') {
      items.push(...(r.value as SourceItem[]))
    } else {
      console.warn(`[Sources] ${labels[i]} aggregateSearch failed:`, r.reason?.message)
    }
  })

  return dedup(items)
}

/**
 * 聚合热点发现：定期自动发现用
 * 数据源：HackerNews / Twitter / GitHub / Bing / Reddit / Dev.to / Google News
 */
export async function aggregateTrending(domain: string): Promise<SourceItem[]> {
  const results = await Promise.allSettled([
    getHNTrending(domain),
    getTwitterTrending(domain),
    getGithubTrending('', 'daily'),
    searchWeb(`${domain} 最新`),
    getGoogleNewsTrending(domain),
    getRedditTrending(domain),
    getDevToTrending(domain),
  ])

  const items: SourceItem[] = []
  const labels = ['HN', 'Twitter', 'GitHub', 'Bing', 'GoogleNews', 'Reddit', 'DevTo']
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      items.push(...(r.value as SourceItem[]))
    } else {
      console.warn(`[Sources] ${labels[i]} aggregateTrending failed:`, r.reason?.message)
    }
  })

  return dedup(items)
}

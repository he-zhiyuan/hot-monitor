import { searchHackerNews, getHNTrending } from './hackernews'
import { searchTwitter, getTwitterTrending } from './twitter'
import { searchGithubTrending, getGithubTrending } from './github'
import { searchWeb } from './websearch'

export interface SourceItem {
  title: string
  url: string
  content: string
  author: string
  publishedAt: Date
  source: string
  [key: string]: unknown
}

/**
 * 聚合多源搜索：监控关键词用
 */
export async function aggregateSearch(keyword: string): Promise<SourceItem[]> {
  const results = await Promise.allSettled([
    searchHackerNews(keyword, 24),
    searchTwitter(keyword, 6),
    searchGithubTrending(keyword),
    searchWeb(keyword),
  ])

  const items: SourceItem[] = []
  results.forEach(r => {
    if (r.status === 'fulfilled') {
      items.push(...(r.value as SourceItem[]))
    }
  })

  // URL 去重
  const seen = new Set<string>()
  return items.filter(item => {
    if (seen.has(item.url)) return false
    seen.add(item.url)
    return true
  })
}

/**
 * 聚合热点发现：定期自动发现用
 */
export async function aggregateTrending(domain: string): Promise<SourceItem[]> {
  const results = await Promise.allSettled([
    getHNTrending(domain),
    getTwitterTrending(domain),
    getGithubTrending('', 'daily'),
    searchWeb(`${domain} 最新`),
  ])

  const items: SourceItem[] = []
  results.forEach(r => {
    if (r.status === 'fulfilled') {
      items.push(...(r.value as SourceItem[]))
    }
  })

  const seen = new Set<string>()
  return items.filter(item => {
    if (seen.has(item.url)) return false
    seen.add(item.url)
    return true
  })
}

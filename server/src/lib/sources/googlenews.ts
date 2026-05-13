import axios from 'axios'
import * as cheerio from 'cheerio'

export interface GoogleNewsItem {
  title: string
  url: string
  content: string
  author: string
  publishedAt: Date
  source: 'googlenews'
}

/**
 * 从 Google News RSS 获取关键词相关新闻
 * 无需 API Key，免费使用
 */
export async function searchGoogleNews(query: string): Promise<GoogleNewsItem[]> {
  return fetchGoogleNewsRSS(query)
}

/**
 * 从 Google News RSS 获取领域热点（用于热点发现）
 */
export async function getGoogleNewsTrending(topic: string): Promise<GoogleNewsItem[]> {
  return fetchGoogleNewsRSS(topic)
}

async function fetchGoogleNewsRSS(query: string): Promise<GoogleNewsItem[]> {
  try {
    const encoded = encodeURIComponent(query)
    // 中英文同时检索，覆盖更广
    const urls = [
      `https://news.google.com/rss/search?q=${encoded}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`,
      `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`,
    ]

    const allItems: GoogleNewsItem[] = []

    for (const rssUrl of urls) {
      try {
        const res = await axios.get(rssUrl, {
          timeout: 12000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; HotMonitor/1.0)',
            Accept: 'application/rss+xml, application/xml, text/xml, */*',
          },
        })

        const $ = cheerio.load(res.data, { xmlMode: true })

        $('item').each((i, el) => {
          if (i >= 8) return
          const $el = $(el)

          const rawTitle = $el.find('title').first().text().trim()
          // Google News 标题格式：「新闻标题 - 来源媒体」
          const title = rawTitle.replace(/\s*-\s*[^-]+$/, '').trim() || rawTitle

          // link 标签在 RSS 中位于 <link> 或 CDATA
          let link = $el.find('link').text().trim()
          if (!link) link = $el.find('guid').text().trim()

          const description = $el.find('description').text().trim().replace(/<[^>]+>/g, '').trim()
          const pubDate = $el.find('pubDate').text().trim()
          const sourceName = $el.find('source').text().trim()

          if (title && link && link.startsWith('http')) {
            allItems.push({
              title,
              url: link,
              content: description || title,
              author: sourceName || '',
              publishedAt: pubDate ? new Date(pubDate) : new Date(),
              source: 'googlenews' as const,
            })
          }
        })
      } catch (err) {
        console.error(`[GoogleNews] RSS fetch error for ${rssUrl}:`, (err as any)?.message)
      }
    }

    // URL 去重（同一新闻可能同时出现在中英文源中）
    const seen = new Set<string>()
    return allItems.filter(item => {
      if (seen.has(item.url)) return false
      seen.add(item.url)
      return true
    })
  } catch (err) {
    console.error('[GoogleNews] error:', (err as any)?.message)
    return []
  }
}

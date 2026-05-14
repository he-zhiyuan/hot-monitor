import axios from 'axios'
import * as cheerio from 'cheerio'

export interface TechNewsItem {
  title: string
  url: string
  content: string
  author: string
  publishedAt: Date
  source: '36kr' | 'sspai'
}

const RSS_FEEDS: Array<{ url: string; source: '36kr' | 'sspai' }> = [
  { url: 'https://36kr.com/feed',  source: '36kr'  },
  { url: 'https://sspai.com/feed', source: 'sspai' },
]

async function fetchRSS(
  feedUrl: string,
  source: '36kr' | 'sspai',
  keyword?: string,
  maxAgeHours = 72
): Promise<TechNewsItem[]> {
  try {
    const res = await axios.get(feedUrl, {
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HotMonitor/1.0)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    })

    const $ = cheerio.load(res.data, { xmlMode: true })
    const items: TechNewsItem[] = []

    $('item').each((i, el) => {
      if (i >= 20) return
      const $el = $(el)

      const title = $el.find('title').first().text().trim()
      // <link> 在 RSS XML 中是文本节点（不是属性），需要特殊处理
      let link = ''
      $el.find('link').each((_, linkEl) => {
        const text = $(linkEl).text().trim()
        if (text.startsWith('http')) { link = text; return false }
      })
      if (!link) link = $el.find('guid').text().trim()

      const description = $el
        .find('description')
        .text()
        .trim()
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;[^&]*&gt;/g, '')
        .trim()
      const pubDate = $el.find('pubDate').text().trim()
      const author =
        $el.find('author').text().trim() ||
        $el.find('dc\\:creator').text().trim()

      if (!title || !link.startsWith('http')) return

      // 时间过滤：丢弃超过 maxAgeHours 的文章
      const parsedDate = pubDate ? new Date(pubDate) : null
      if (parsedDate && !isNaN(parsedDate.getTime())) {
        const ageHours = (Date.now() - parsedDate.getTime()) / 3600000
        if (ageHours > maxAgeHours) return
      }

      // 关键词过滤：标题或摘要包含关键词首词即通过
      if (keyword) {
        const firstWord = keyword.toLowerCase().split(/\s+/)[0]
        const text = `${title} ${description}`.toLowerCase()
        if (!text.includes(firstWord)) return
      }

      items.push({
        title,
        url: link,
        content: description.slice(0, 400) || title,
        author,
        publishedAt: pubDate ? new Date(pubDate) : new Date(),
        source,
      })
    })

    return items
  } catch (err) {
    console.error(`[TechNews] RSS error for ${feedUrl}:`, (err as any)?.message)
    return []
  }
}

/** 搜索36氪（关键词过滤） */
export async function search36Kr(keyword: string): Promise<TechNewsItem[]> {
  return fetchRSS('https://36kr.com/feed', '36kr', keyword)
}

/** 获取36氪最新内容（热点发现，不过滤） */
export async function get36KrTrending(): Promise<TechNewsItem[]> {
  return fetchRSS('https://36kr.com/feed', '36kr')
}

/** 搜索少数派（关键词过滤） */
export async function searchSspai(keyword: string): Promise<TechNewsItem[]> {
  return fetchRSS('https://sspai.com/feed', 'sspai', keyword)
}

/** 获取少数派最新内容（热点发现，不过滤） */
export async function getSspaiTrending(): Promise<TechNewsItem[]> {
  return fetchRSS('https://sspai.com/feed', 'sspai')
}

/** 同时搜索两个源（关键词监控，48h 时间窗口） */
export async function searchTechNews(keyword: string): Promise<TechNewsItem[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(f => fetchRSS(f.url, f.source, keyword, 48))
  )
  return results.flatMap(r => (r.status === 'fulfilled' ? r.value : []))
}

/** 同时获取两个源的热点内容（热点发现，72h 时间窗口） */
export async function getTechNewsTrending(): Promise<TechNewsItem[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(f => fetchRSS(f.url, f.source, undefined, 72))
  )
  return results.flatMap(r => (r.status === 'fulfilled' ? r.value : []))
}

import axios from 'axios'
import * as cheerio from 'cheerio'

export interface WebItem {
  title: string
  url: string
  content: string
  author: string
  publishedAt: Date
  source: 'web'
}

/**
 * 通过 Bing 搜索（国内可访问，无需 API Key）
 */
export async function searchWeb(query: string): Promise<WebItem[]> {
  try {
    const res = await axios.get('https://www.bing.com/search', {
      params: { q: query, count: 10, setlang: 'zh-CN' },
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    })

    const $ = cheerio.load(res.data)
    const results: WebItem[] = []

    // Bing 搜索结果选择器
    $('#b_results .b_algo').each((i, el) => {
      if (i >= 10) return
      const $el = $(el)
      const title = $el.find('h2 a').text().trim()
      const url = $el.find('h2 a').attr('href') || ''
      const snippet = $el.find('.b_caption p').text().trim()

      if (title && url.startsWith('http')) {
        results.push({
          title,
          url,
          content: snippet || title,
          author: '',
          publishedAt: new Date(),
          source: 'web' as const,
        })
      }
    })

    return results
  } catch (err) {
    console.error('[WebSearch] Bing error:', (err as any)?.message || err)
    return []
  }
}

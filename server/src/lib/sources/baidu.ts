import axios from 'axios'
import * as cheerio from 'cheerio'

export interface BaiduItem {
  title: string
  url: string
  content: string
  author: string
  publishedAt: Date
  source: 'baidu'
}

/**
 * 百度搜索爬虫（国内中文内容补充）
 */
export async function searchBaidu(query: string): Promise<BaiduItem[]> {
  try {
    const res = await axios.get('https://www.baidu.com/s', {
      params: { wd: query, rn: 10, ie: 'utf-8' },
      timeout: 12000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
      },
    })

    const $ = cheerio.load(res.data)
    const results: BaiduItem[] = []

    // 匹配百度自然搜索结果（.result 和 .result-op）
    $('#content_left .result, #content_left .result-op').each((i, el) => {
      if (i >= 10) return
      const $el = $(el)

      const $link = $el.find('h3 a').first()
      const title = $link.text().trim()
      const url = $link.attr('href') || ''
      // 百度使用跳转链接（baidu.com/link?url=...），直接保留原始链接
      const snippet =
        $el.find('.c-abstract').first().text().trim() ||
        $el.find('[class*="abstract"]').first().text().trim() ||
        $el.find('.content-right').first().text().trim()

      if (!title || !url.startsWith('http')) return

      results.push({
        title,
        url,
        content: snippet || title,
        author: '',
        publishedAt: new Date(),
        source: 'baidu' as const,
      })
    })

    return results
  } catch (err) {
    console.error('[Baidu] search error:', (err as any)?.message)
    return []
  }
}

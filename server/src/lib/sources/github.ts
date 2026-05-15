import axios from 'axios'
import * as cheerio from 'cheerio'

export interface GithubItem {
  title: string
  url: string
  content: string
  author: string
  publishedAt: Date
  source: 'github'
  stars: number
  todayStars: number
  language: string
  likes?: number
  views?: number
}

export async function getGithubTrending(language = '', since = 'daily'): Promise<GithubItem[]> {
  try {
    const url = `https://github.com/trending${language ? `/${language}` : ''}?since=${since}`
    const res = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    const $ = cheerio.load(res.data)
    const repos: GithubItem[] = []

    $('article.Box-row').each((_, el) => {
      const $el = $(el)
      const repoPath = $el.find('h2 a').attr('href')?.trim()
      if (!repoPath) return

      const repoName = repoPath.replace(/^\//, '')
      const description = $el.find('p').text().trim()
      const language = $el.find('[itemprop="programmingLanguage"]').text().trim()

      const starsText = $el
        .find('a[href$="/stargazers"]')
        .first()
        .text()
        .trim()
        .replace(/,/g, '')
        .replace(/[^0-9.kmKM]/g, '')
      const todayStarsText = $el.find('.float-sm-right').text().trim()

      const parseStars = (text: string): number => {
        const num = parseFloat(text)
        if (text.toLowerCase().includes('k')) return Math.round(num * 1000)
        if (text.toLowerCase().includes('m')) return Math.round(num * 1000000)
        return num || 0
      }

      const todayMatch = todayStarsText.match(/(\d+(?:,\d+)?)\s*stars today/)
      const todayStars = todayMatch ? parseInt(todayMatch[1].replace(',', '')) : 0

      repos.push({
        title: `[GitHub Trending] ${repoName}`,
        url: `https://github.com${repoPath}`,
        content: description || repoName,
        author: repoName.split('/')[0],
        publishedAt: new Date(),
        source: 'github' as const,
        stars: parseStars(starsText),
        todayStars,
        language,
        likes: todayStars,
        views: parseStars(starsText),
      })
    })

    return repos
  } catch (err) {
    console.error('[GitHub] trending error:', err)
    return []
  }
}

export async function searchGithubTrending(query: string): Promise<GithubItem[]> {
  const all = await getGithubTrending('', 'daily')
  const lower = query.toLowerCase()
  return all.filter(
    item =>
      item.title.toLowerCase().includes(lower) ||
      item.content.toLowerCase().includes(lower)
  )
}

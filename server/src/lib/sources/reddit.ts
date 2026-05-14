import axios from 'axios'

export interface RedditItem {
  title: string
  url: string
  content: string
  author: string
  publishedAt: Date
  source: 'reddit'
  score: number
  numComments: number
  subreddit: string
}

// AI / 编程领域高质量子版块
const AI_SUBREDDITS = [
  'LocalLLaMA',
  'MachineLearning',
  'ChatGPT',
  'ClaudeAI',
  'artificial',
  'programming',
  'singularity',
]

const HEADERS = {
  'User-Agent': 'HotMonitor/1.0 (personal news aggregator; contact via GitHub)',
  Accept: 'application/json',
}

function mapPost(d: any): RedditItem {
  const url = d.url?.startsWith('/r/')
    ? `https://www.reddit.com${d.url}`
    : d.url || `https://www.reddit.com${d.permalink}`
  return {
    title: d.title,
    url,
    content: d.selftext?.slice(0, 500) || d.title,
    author: d.author || '',
    publishedAt: new Date(d.created_utc * 1000),
    source: 'reddit' as const,
    score: d.score || 0,
    numComments: d.num_comments || 0,
    subreddit: d.subreddit || '',
  }
}

/**
 * 按关键词在多个 AI 子版块中搜索（用于关键词监控）
 * 并行请求，单个超时不影响其他子版块
 */
export async function searchReddit(query: string): Promise<RedditItem[]> {
  const fetches = AI_SUBREDDITS.slice(0, 3).map(sub =>
    axios
      .get(`https://www.reddit.com/r/${sub}/search.json`, {
        params: { q: query, sort: 'new', t: 'day', limit: 15, restrict_sr: 1 },
        headers: HEADERS,
        timeout: 8000,
      })
      .then(res => {
        const posts: any[] = res.data?.data?.children || []
        return posts
          .filter(p => p.data?.score >= 5 && p.data?.title)
          .map(p => mapPost(p.data))
      })
      .catch(err => {
        console.warn(`[Reddit] search r/${sub}:`, (err as any)?.message)
        return [] as RedditItem[]
      })
  )

  const settled = await Promise.all(fetches)
  return settled.flat()
}

/**
 * 获取各 AI 子版块的热门帖子（用于热点发现）
 * 并行请求，单个超时不影响其他子版块
 */
export async function getRedditTrending(topic: string): Promise<RedditItem[]> {
  const cutoff = Date.now() / 1000 - 48 * 3600
  const topicKeyword = topic.toLowerCase().split(/\s+/)[0]

  const fetches = AI_SUBREDDITS.map(sub =>
    axios
      .get(`https://www.reddit.com/r/${sub}/hot.json`, {
        params: { limit: 15 },
        headers: HEADERS,
        timeout: 8000,
      })
      .then(res => {
        const posts: any[] = res.data?.data?.children || []
        return posts
          .filter(p => {
            const d = p.data
            if (!d?.title || d.score < 10) return false
            if (d.created_utc < cutoff) return false
            if (!topicKeyword) return true
            const text = `${d.title} ${d.selftext || ''} ${d.subreddit}`.toLowerCase()
            return text.includes(topicKeyword)
          })
          .map(p => mapPost(p.data))
      })
      .catch(err => {
        console.warn(`[Reddit] trending r/${sub}:`, (err as any)?.message)
        return [] as RedditItem[]
      })
  )

  const settled = await Promise.all(fetches)
  return settled.flat()
}

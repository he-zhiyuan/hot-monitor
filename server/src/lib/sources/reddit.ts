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
 */
export async function searchReddit(query: string): Promise<RedditItem[]> {
  const results: RedditItem[] = []

  // 只搜最相关的3个子版块，避免请求过多
  for (const sub of AI_SUBREDDITS.slice(0, 3)) {
    try {
      const res = await axios.get(`https://www.reddit.com/r/${sub}/search.json`, {
        params: { q: query, sort: 'new', t: 'week', limit: 15, restrict_sr: 1 },
        headers: HEADERS,
        timeout: 12000,
      })

      const posts: any[] = res.data?.data?.children || []
      posts
        .filter(p => p.data?.score >= 5 && p.data?.title)
        .forEach(p => results.push(mapPost(p.data)))
    } catch (err) {
      console.error(`[Reddit] search error for r/${sub}:`, (err as any)?.message)
    }
    // 遵守 Reddit 速率限制（1 req/s）
    await new Promise(r => setTimeout(r, 1100))
  }

  return results
}

/**
 * 获取各 AI 子版块的热门帖子（用于热点发现）
 */
export async function getRedditTrending(topic: string): Promise<RedditItem[]> {
  const results: RedditItem[] = []
  const topicKeyword = topic.toLowerCase().split(/\s+/)[0]

  for (const sub of AI_SUBREDDITS) {
    try {
      const res = await axios.get(`https://www.reddit.com/r/${sub}/hot.json`, {
        params: { limit: 15 },
        headers: HEADERS,
        timeout: 12000,
      })

      const posts: any[] = res.data?.data?.children || []
      posts
        .filter(p => {
          const d = p.data
          if (!d?.title || d.score < 10) return false
          // 如果 topic 为空或帖子内容/标签包含关键词则通过
          if (!topicKeyword) return true
          const text = `${d.title} ${d.selftext || ''} ${d.subreddit}`.toLowerCase()
          return text.includes(topicKeyword)
        })
        .forEach(p => results.push(mapPost(p.data)))
    } catch (err) {
      console.error(`[Reddit] trending error for r/${sub}:`, (err as any)?.message)
    }
    await new Promise(r => setTimeout(r, 1100))
  }

  return results
}

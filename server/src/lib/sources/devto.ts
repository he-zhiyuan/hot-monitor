import axios from 'axios'

export interface DevToItem {
  title: string
  url: string
  content: string
  author: string
  publishedAt: Date
  source: 'devto'
  reactions: number
  tags: string[]
  likes?: number
  comments?: number
}

const BASE = 'https://dev.to/api'

// 与 AI/编程领域高度相关的标签
const AI_TAGS = ['ai', 'machinelearning', 'llm', 'deeplearning', 'chatgpt', 'python']

function mapArticle(a: any): DevToItem {
  return {
    title: a.title,
    url: a.url,
    content: a.description || a.title,
    author: a.user?.name || a.user?.username || '',
    publishedAt: new Date(a.published_at),
    source: 'devto' as const,
    reactions: a.public_reactions_count || 0,
    tags: a.tag_list || [],
    likes: a.public_reactions_count || 0,
    comments: a.comments_count || 0,
  }
}

/**
 * 按关键词搜索 Dev.to 文章（用于关键词监控）
 * Dev.to 无公开全文搜索 API，通过相关标签 + 标题匹配实现
 */
export async function searchDevTo(query: string): Promise<DevToItem[]> {
  const queryLower = query.toLowerCase()
  const results: DevToItem[] = []

  // 从与 query 最相关的2个标签中抓取
  const targetTags = AI_TAGS.filter(t => queryLower.includes(t)).slice(0, 2)
  if (targetTags.length === 0) targetTags.push('ai', 'machinelearning')

  for (const tag of targetTags) {
    try {
      const res = await axios.get(`${BASE}/articles`, {
        params: { tag, per_page: 30, state: 'fresh' },
        timeout: 12000,
        headers: { Accept: 'application/json' },
      })

      const articles: any[] = res.data || []
      articles
        .filter(a => {
          const text = `${a.title} ${a.description || ''}`.toLowerCase()
          // 标题或摘要包含查询关键词的首词
          return text.includes(queryLower.split(/\s+/)[0])
        })
        .forEach(a => results.push(mapArticle(a)))
    } catch (err) {
      console.error(`[DevTo] search error for tag=${tag}:`, (err as any)?.message)
    }
  }

  return results
}

/**
 * 获取当天 Dev.to 热门文章（用于热点发现）
 */
export async function getDevToTrending(topic: string): Promise<DevToItem[]> {
  try {
    // top=1 返回最近24小时最受欢迎的文章
    const res = await axios.get(`${BASE}/articles`, {
      params: { per_page: 30, top: 1 },
      timeout: 12000,
      headers: { Accept: 'application/json' },
    })

    const articles: any[] = res.data || []
    const topicLower = topic.toLowerCase().split(/\s+/)[0]

    return articles
      .filter(a => {
        const text = `${a.title} ${a.description || ''} ${(a.tag_list || []).join(' ')}`.toLowerCase()
        // 命中主题关键词，或文章包含 AI 相关标签
        return (
          (topicLower && text.includes(topicLower)) ||
          (a.tag_list || []).some((t: string) => AI_TAGS.includes(t))
        )
      })
      .map(mapArticle)
  } catch (err) {
    console.error('[DevTo] trending error:', (err as any)?.message)
    return []
  }
}

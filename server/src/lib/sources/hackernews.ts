import axios from 'axios'

export interface HNItem {
  title: string
  url: string
  content: string
  author: string
  publishedAt: Date
  source: 'hackernews'
  points: number
  numComments: number
}

const HN_API = 'https://hn.algolia.com/api/v1'

export async function searchHackerNews(query: string, hoursBack = 24): Promise<HNItem[]> {
  try {
    const sinceTs = Math.floor(Date.now() / 1000) - hoursBack * 3600
    const res = await axios.get(`${HN_API}/search_by_date`, {
      params: {
        query,
        tags: 'story',
        numericFilters: `created_at_i>${sinceTs}`,
        hitsPerPage: 20,
      },
      timeout: 10000,
    })

    return (res.data.hits || [])
      .filter((h: any) => h.title && (h.url || h.story_url))
      .map((h: any) => ({
        title: h.title,
        url: h.url || h.story_url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        content: h.story_text || h.comment_text || h.title,
        author: h.author || '',
        publishedAt: new Date(h.created_at),
        source: 'hackernews' as const,
        points: h.points || 0,
        numComments: h.num_comments || 0,
        likes: h.points || 0,
        comments: h.num_comments || 0,
      }))
  } catch (err) {
    console.error('[HackerNews] search error:', err)
    return []
  }
}

export async function getHNTrending(query: string): Promise<HNItem[]> {
  try {
    const res = await axios.get(`${HN_API}/search`, {
      params: {
        query,
        tags: 'story',
        hitsPerPage: 30,
        numericFilters: `points>10,num_comments>5`,
      },
      timeout: 10000,
    })

    return (res.data.hits || [])
      .filter((h: any) => h.title && (h.url || h.story_url))
      .map((h: any) => ({
        title: h.title,
        url: h.url || h.story_url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        content: h.story_text || h.title,
        author: h.author || '',
        publishedAt: new Date(h.created_at),
        source: 'hackernews' as const,
        points: h.points || 0,
        numComments: h.num_comments || 0,
        likes: h.points || 0,
        comments: h.num_comments || 0,
      }))
  } catch (err) {
    console.error('[HackerNews] trending error:', err)
    return []
  }
}

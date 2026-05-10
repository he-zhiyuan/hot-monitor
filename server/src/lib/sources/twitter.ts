import axios from 'axios'

export interface TwitterItem {
  title: string
  url: string
  content: string
  author: string
  publishedAt: Date
  source: 'twitter'
  likeCount: number
  retweetCount: number
  viewCount: number
}

const TWITTER_API = 'https://api.twitterapi.io'

function getHeaders() {
  return { 'X-API-Key': process.env.TWITTERAPI_IO_KEY || '' }
}

export async function searchTwitter(query: string, hoursBack = 6): Promise<TwitterItem[]> {
  const key = process.env.TWITTERAPI_IO_KEY
  if (!key) {
    console.warn('[Twitter] TWITTERAPI_IO_KEY not set, skipping')
    return []
  }

  try {
    // 使用 since_time 控制时间范围，避免分页问题
    const sinceTime = Math.floor(Date.now() / 1000) - hoursBack * 3600
    const untilTime = Math.floor(Date.now() / 1000)

    const res = await axios.get(`${TWITTER_API}/twitter/tweet/advanced_search`, {
      headers: getHeaders(),
      params: {
        query: `${query} since_time:${sinceTime} until_time:${untilTime}`,
        queryType: 'Latest',
      },
      timeout: 15000,
    })

    const tweets = res.data.tweets || []
    return tweets
      .filter((t: any) => t.text && !t.retweeted_tweet)
      .map((t: any) => ({
        title: `@${t.author?.userName}: ${t.text.slice(0, 100)}`,
        url: t.url || `https://x.com/${t.author?.userName}/status/${t.id}`,
        content: t.text,
        author: t.author?.name || t.author?.userName || '',
        publishedAt: new Date(t.createdAt),
        source: 'twitter' as const,
        likeCount: t.likeCount || 0,
        retweetCount: t.retweetCount || 0,
        viewCount: t.viewCount || 0,
      }))
  } catch (err: any) {
    console.error('[Twitter] search error:', err?.response?.data || err?.message)
    return []
  }
}

export async function getTwitterTrending(query: string): Promise<TwitterItem[]> {
  const key = process.env.TWITTERAPI_IO_KEY
  if (!key) return []

  try {
    // 搜索近 24 小时，优先高互动推文
    const sinceTime = Math.floor(Date.now() / 1000) - 86400
    const res = await axios.get(`${TWITTER_API}/twitter/tweet/advanced_search`, {
      headers: getHeaders(),
      params: {
        query: `${query} since_time:${sinceTime} min_faves:10`,
        queryType: 'Top',
      },
      timeout: 15000,
    })

    const tweets = res.data.tweets || []
    return tweets
      .filter((t: any) => t.text && !t.retweeted_tweet)
      .map((t: any) => ({
        title: `@${t.author?.userName}: ${t.text.slice(0, 100)}`,
        url: t.url || `https://x.com/${t.author?.userName}/status/${t.id}`,
        content: t.text,
        author: t.author?.name || t.author?.userName || '',
        publishedAt: new Date(t.createdAt),
        source: 'twitter' as const,
        likeCount: t.likeCount || 0,
        retweetCount: t.retweetCount || 0,
        viewCount: t.viewCount || 0,
      }))
  } catch (err: any) {
    console.error('[Twitter] trending error:', err?.response?.data || err?.message)
    return []
  }
}

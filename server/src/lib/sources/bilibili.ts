import axios from 'axios'

export interface BilibiliItem {
  title: string
  url: string
  content: string
  author: string
  publishedAt: Date
  source: 'bilibili'
  views: number
  likes: number
}

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Referer: 'https://www.bilibili.com',
  Accept: 'application/json',
}

// 去除 Bilibili API 返回标题中的 HTML 加粗标签
function cleanTitle(title: string): string {
  return title.replace(/<[^>]+>/g, '').trim()
}

/**
 * 按关键词搜索 B站视频（普通搜索模式）
 */
export async function searchBilibili(keyword: string): Promise<BilibiliItem[]> {
  try {
    const res = await axios.get(
      'https://api.bilibili.com/x/web-interface/search/type',
      {
        params: {
          search_type: 'video',
          keyword,
          order: 'pubdate',
          duration: 0,
          page: 1,
          page_size: 15,
        },
        headers: HEADERS,
        timeout: 12000,
      }
    )

    if (res.data?.code !== 0) {
      console.warn('[Bilibili] search API code:', res.data?.code, res.data?.message)
      return []
    }

    const videos: any[] = res.data?.data?.result || []
    return videos
      .filter(v => v.bvid && v.title)
      .map(v => ({
        title: cleanTitle(v.title),
        url: `https://www.bilibili.com/video/${v.bvid}`,
        content: v.description || cleanTitle(v.title),
        author: v.author || '',
        publishedAt: new Date(v.pubdate * 1000),
        source: 'bilibili' as const,
        views: v.play || 0,
        likes: v.like || 0,
      }))
  } catch (err) {
    console.error('[Bilibili] search error:', (err as any)?.message)
    return []
  }
}

/**
 * 账号模式：按 UP主 名称搜索，获取其最新投稿视频
 * 当关键词以 @ 开头时触发（如 @宝玉）
 */
export async function searchBilibiliUser(username: string): Promise<BilibiliItem[]> {
  try {
    // Step 1：搜索 UP主
    const userRes = await axios.get(
      'https://api.bilibili.com/x/web-interface/search/type',
      {
        params: {
          search_type: 'bili_user',
          keyword: username,
          page: 1,
        },
        headers: HEADERS,
        timeout: 12000,
      }
    )

    if (userRes.data?.code !== 0) return []

    const users: any[] = userRes.data?.data?.result || []
    if (users.length === 0) {
      console.warn(`[Bilibili] No UP主 found for: ${username}`)
      return []
    }

    // 取名称最匹配的第一个结果
    const topUser = users[0]
    const mid: number = topUser.mid
    console.log(`[Bilibili] Found UP主: ${topUser.uname} (mid=${mid})`)

    // Step 2：获取该 UP主 最新投稿
    const videosRes = await axios.get(
      'https://api.bilibili.com/x/space/arc/search',
      {
        params: { mid, ps: 10, pn: 1, order: 'pubdate' },
        headers: HEADERS,
        timeout: 12000,
      }
    )

    if (videosRes.data?.code !== 0) return []

    const videos: any[] = videosRes.data?.data?.list?.vlist || []
    return videos.map(v => ({
      title: v.title,
      url: `https://www.bilibili.com/video/${v.bvid || `av${v.aid}`}`,
      content: v.description || v.title,
      author: topUser.uname || username,
      publishedAt: new Date(v.created * 1000),
      source: 'bilibili' as const,
      views: v.play || 0,
      likes: 0,
    }))
  } catch (err) {
    console.error('[Bilibili] user search error:', (err as any)?.message)
    return []
  }
}

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
  comments?: number
}

const BASE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Referer: 'https://www.bilibili.com',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  Origin: 'https://www.bilibili.com',
}

// ── buvid 缓存（进程内有效，规避 412 风控）────────────────────────────────────

let cachedBuvid3 = ''

async function getBuvid3(): Promise<string> {
  if (cachedBuvid3) return cachedBuvid3
  try {
    const res = await axios.get('https://api.bilibili.com/x/frontend/finger/spi', {
      headers: BASE_HEADERS,
      timeout: 8000,
    })
    if (res.data?.code === 0) {
      cachedBuvid3 = res.data.data?.b_3 || ''
      console.log('[Bilibili] Got buvid3:', cachedBuvid3.slice(0, 12) + '…')
    }
  } catch {
    // buvid 获取失败不影响主流程，降级为无 cookie 请求
  }
  return cachedBuvid3
}

async function getHeaders(): Promise<Record<string, string>> {
  const buvid3 = await getBuvid3()
  return {
    ...BASE_HEADERS,
    ...(buvid3 ? { Cookie: `buvid3=${buvid3}` } : {}),
  }
}

// ── 工具 ─────────────────────────────────────────────────────────────────────

function cleanTitle(title: string): string {
  return title.replace(/<[^>]+>/g, '').trim()
}

// ── 普通关键词搜索 ────────────────────────────────────────────────────────────

export async function searchBilibili(keyword: string): Promise<BilibiliItem[]> {
  try {
    const headers = await getHeaders()
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
        headers,
        timeout: 12000,
      }
    )

    if (res.data?.code !== 0) {
      console.warn('[Bilibili] search API code:', res.data?.code, res.data?.message)
      return []
    }

    const cutoffTs = Math.floor(Date.now() / 1000) - 7 * 86400
    const videos: any[] = res.data?.data?.result || []
    return videos
      .filter(v => v.bvid && v.title && (v.pubdate || 0) >= cutoffTs)
      .map(v => ({
        title: cleanTitle(v.title),
        url: `https://www.bilibili.com/video/${v.bvid}`,
        content: v.description || cleanTitle(v.title),
        author: v.author || '',
        publishedAt: new Date(v.pubdate * 1000),
        source: 'bilibili' as const,
        views: v.play || 0,
        likes: v.like || 0,
        comments: v.review || 0,
      }))
  } catch (err) {
    console.error('[Bilibili] search error:', (err as any)?.message)
    return []
  }
}

// ── 账号模式 ─────────────────────────────────────────────────────────────────

/**
 * 账号模式：获取指定 UP主 的最新投稿视频
 * 当关键词以 @ 开头时触发（如 @程序员鱼皮）
 *
 * 实现：
 *   Step 1 - bili_user 搜索，获取 UP主 精确昵称
 *   Step 2 - 视频搜索 + author 精确过滤（替代已废弃的 /x/space/arc/search）
 */
export async function searchBilibiliUser(username: string): Promise<BilibiliItem[]> {
  try {
    const headers = await getHeaders()

    // Step 1：获取 UP主 精确昵称
    const userRes = await axios.get(
      'https://api.bilibili.com/x/web-interface/search/type',
      {
        params: { search_type: 'bili_user', keyword: username, page: 1 },
        headers,
        timeout: 10000,
      }
    )

    if (userRes.data?.code !== 0) {
      console.warn(`[Bilibili] bili_user search code: ${userRes.data?.code}`)
      return []
    }

    const users: any[] = userRes.data?.data?.result || []
    if (users.length === 0) {
      console.warn(`[Bilibili] No UP主 found for: ${username}`)
      return []
    }

    // 优先精确匹配，否则取第一个
    const matched = users.find((u: any) => u.uname === username) || users[0]
    const exactName: string = matched.uname
    console.log(`[Bilibili] Found UP主: ${exactName} (mid=${matched.mid})`)

    // Step 2：视频搜索 + author 精确过滤
    const videoRes = await axios.get(
      'https://api.bilibili.com/x/web-interface/search/type',
      {
        params: {
          search_type: 'video',
          keyword: exactName,
          order: 'pubdate',
          page: 1,
          page_size: 20,
        },
        headers,
        timeout: 10000,
      }
    )

    if (videoRes.data?.code !== 0) return []

    const videos: any[] = videoRes.data?.data?.result || []
    const cutoffTs = Math.floor(Date.now() / 1000) - 30 * 86400 // 30天内

    return videos
      .filter((v: any) =>
        v.bvid &&
        v.title &&
        v.author === exactName &&
        (v.pubdate || 0) >= cutoffTs
      )
      .map((v: any) => ({
        title: cleanTitle(v.title),
        url: `https://www.bilibili.com/video/${v.bvid}`,
        content: v.description || cleanTitle(v.title),
        author: exactName,
        publishedAt: new Date(v.pubdate * 1000),
        source: 'bilibili' as const,
        views: v.play || 0,
        likes: v.like || 0,
        comments: v.review || 0,
      }))
  } catch (err) {
    console.error('[Bilibili] user search error:', (err as any)?.message)
    return []
  }
}

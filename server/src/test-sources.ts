/**
 * 数据源可用性测试脚本
 * 运行方式：npx tsx src/test-sources.ts [关键词]
 * 示例：npx tsx src/test-sources.ts "Claude"
 */
import 'dotenv/config'
import { searchHackerNews } from './lib/sources/hackernews'
import { searchTwitter } from './lib/sources/twitter'
import { searchGithubTrending } from './lib/sources/github'
import { searchWeb } from './lib/sources/websearch'
import { searchReddit } from './lib/sources/reddit'
import { searchDevTo } from './lib/sources/devto'
import { searchGoogleNews } from './lib/sources/googlenews'
import { searchBaidu } from './lib/sources/baidu'
import { searchBilibili } from './lib/sources/bilibili'
import { searchTechNews } from './lib/sources/technews'

const KEYWORD = process.argv[2] || 'AI'
const LINE = '─'.repeat(60)

// ANSI 颜色
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
  blue:   '\x1b[34m',
}

function fmt(n: number) {
  if (n >= 100) return `${C.green}${n}${C.reset}`
  if (n > 0)    return `${C.yellow}${n}${C.reset}`
  return `${C.red}${n}${C.reset}`
}

function timeAgo(d?: Date | null): string {
  if (!d) return 'N/A'
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1)    return '刚刚'
  if (mins < 60)   return `${mins}m 前`
  if (mins < 1440) return `${Math.round(mins / 60)}h 前`
  return `${Math.round(mins / 1440)}d 前`
}

async function testSource(
  name: string,
  fetcher: () => Promise<any[]>,
  notesFn?: (items: any[]) => string
) {
  process.stdout.write(`  ${C.cyan}${name.padEnd(16)}${C.reset} ... `)
  const t0 = Date.now()
  try {
    const items = await fetcher()
    const elapsed = Date.now() - t0
    const count = items.length

    // 计算时间分布
    const ages = items
      .map(i => i.publishedAt?.getTime?.() ?? null)
      .filter(t => t && t < Date.now() - 60_000)  // 排除 new Date() 占位
      .map(t => Math.round((Date.now() - t!) / 3600000))  // 小时数

    const freshCount = items.filter(i => {
      const t = i.publishedAt?.getTime?.() ?? null
      if (!t) return false
      return t >= Date.now() - 48 * 3600_000
    }).length

    const oldCount = ages.filter(h => h > 48).length

    // 状态行
    const statusLine = [
      `${fmt(count)} 条`,
      `${C.gray}(${elapsed}ms)${C.reset}`,
      count > 0 && ages.length > 0 ? `最新: ${C.blue}${timeAgo(items[0]?.publishedAt)}${C.reset}` : '',
      oldCount > 0 ? `${C.red}⚠ ${oldCount} 条超48h${C.reset}` : '',
      notesFn ? `${C.gray}${notesFn(items)}${C.reset}` : '',
    ].filter(Boolean).join('  ')

    console.log(statusLine)

    // 打印前3条样本
    items.slice(0, 3).forEach((item, i) => {
      const age = timeAgo(item.publishedAt)
      const title = (item.title || '').slice(0, 58)
      console.log(
        `    ${C.gray}${i + 1}.${C.reset} ${title}${title.length >= 58 ? '…' : ''}  ${C.gray}[${age}]${C.reset}`
      )
    })

    return { name, count, freshCount, oldCount, ok: true }
  } catch (err: any) {
    const elapsed = Date.now() - t0
    console.log(`${C.red}FAILED${C.reset}  ${C.gray}(${elapsed}ms) ${err?.message || err}${C.reset}`)
    return { name, count: 0, freshCount: 0, oldCount: 0, ok: false }
  }
}

async function main() {
  console.log()
  console.log(`${C.bold}${LINE}${C.reset}`)
  console.log(`${C.bold}  HotMonitor 数据源测试  关键词: "${KEYWORD}"${C.reset}`)
  console.log(`${C.bold}${LINE}${C.reset}`)
  console.log()

  const results = []

  // ── 国际源 ────────────────────────────────────────────────
  console.log(`${C.bold}【国际源】${C.reset}`)

  results.push(await testSource('HackerNews', () => searchHackerNews(KEYWORD, 48)))

  results.push(await testSource(
    'Twitter/X',
    () => searchTwitter(KEYWORD, 12),
    items => process.env.TWITTERAPI_IO_KEY ? `key: ✓` : `key: ✗ 未配置`
  ))

  results.push(await testSource(
    'GitHub',
    () => searchGithubTrending(KEYWORD),
    items => items.length > 0 ? `stars: ${items[0]?.todayStars ?? 0}` : ''
  ))

  results.push(await testSource('Reddit', () => searchReddit(KEYWORD)))

  results.push(await testSource('Dev.to', () => searchDevTo(KEYWORD)))

  results.push(await testSource('Google News', () => searchGoogleNews(KEYWORD)))

  results.push(await testSource('Bing', () => searchWeb(KEYWORD)))

  // ── 国内源 ────────────────────────────────────────────────
  console.log()
  console.log(`${C.bold}【国内源】${C.reset}`)

  results.push(await testSource('百度', () => searchBaidu(KEYWORD)))

  results.push(await testSource('B站 Bilibili', () => searchBilibili(KEYWORD)))

  results.push(await testSource(
    '36氪+少数派',
    () => searchTechNews(KEYWORD),
    items => {
      const s36 = items.filter(i => i.source === '36kr').length
      const sspai = items.filter(i => i.source === 'sspai').length
      return `36氪:${s36} 少数派:${sspai}`
    }
  ))

  // ── 汇总 ──────────────────────────────────────────────────
  console.log()
  console.log(`${C.bold}${LINE}${C.reset}`)
  console.log(`${C.bold}  汇总${C.reset}`)
  console.log(LINE)

  const total     = results.reduce((s, r) => s + r.count, 0)
  const freshTotal = results.reduce((s, r) => s + r.freshCount, 0)
  const failedSrcs = results.filter(r => !r.ok).map(r => r.name)
  const emptySrcs  = results.filter(r => r.ok && r.count === 0).map(r => r.name)

  console.log(`  总计: ${fmt(total)} 条  新鲜(<48h): ${fmt(freshTotal)} 条`)

  if (failedSrcs.length) {
    console.log(`  ${C.red}请求失败: ${failedSrcs.join(', ')}${C.reset}`)
  }
  if (emptySrcs.length) {
    console.log(`  ${C.yellow}返回0条: ${emptySrcs.join(', ')}${C.reset}`)
    console.log(`  ${C.gray}  → 可能原因：关键词 "${KEYWORD}" 在该平台无匹配，或时间窗口内无新内容${C.reset}`)
  }

  const workingSrcs = results.filter(r => r.ok && r.count > 0)
  if (workingSrcs.length === results.length) {
    console.log(`  ${C.green}✓ 全部 ${results.length} 个源正常${C.reset}`)
  }
  console.log()
}

main().catch(console.error)

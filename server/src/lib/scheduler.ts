import cron from 'node-cron'
import { prisma } from './prisma'
import { aggregateSearch, aggregateTrending } from './sources'
import { verifyContent, scoreHotspots } from './openrouter'
import { sendNotificationEmail } from './email'
import { pushNotification } from './socket'

let isInitialized = false

/**
 * 扫描单个监控关键词
 * 返回：{ foundCount, notifiedCount }
 */
export async function scanMonitor(monitorId: string): Promise<{ foundCount: number; notifiedCount: number }> {
  const monitor = await prisma.monitor.findUnique({ where: { id: monitorId } })
  if (!monitor || !monitor.isActive) return { foundCount: 0, notifiedCount: 0 }

  console.log(`[Scheduler] Scanning monitor: "${monitor.keyword}"`)

  const existingUrls = new Set(
    (await prisma.finding.findMany({
      where: { monitorId },
      select: { url: true },
    })).map(f => f.url)
  )

  const items = await aggregateSearch(monitor.keyword)
  const newItems = items.filter(item => !existingUrls.has(item.url))

  if (newItems.length === 0) {
    await prisma.monitor.update({ where: { id: monitorId }, data: { lastChecked: new Date() } })
    return { foundCount: 0, notifiedCount: 0 }
  }

  // 只取前5条（减少 AI 调用次数，避免限流）
  const itemsToProcess = newItems.slice(0, 5)
  console.log(`[Scheduler] Found ${itemsToProcess.length} new items for "${monitor.keyword}"`)

  let notifiedCount = 0

  for (const item of itemsToProcess) {
    // 每次 AI 调用前等待 5 秒，避免免费模型限流（429）
    await new Promise(r => setTimeout(r, 5000))

    const aiResult = await verifyContent(monitor.keyword, item.title, item.content)
    const aiFailed = aiResult.relevance === 0 && !aiResult.isReal && aiResult.reason === 'AI 分析失败'
    const aiFiltered = !aiFailed && !aiResult.isReal && aiResult.relevance < 0.5

    await prisma.finding.create({
      data: {
        monitorId,
        title: item.title,
        content: item.content.slice(0, 2000),
        url: item.url,
        source: item.source,
        author: item.author || '',
        publishedAt: item.publishedAt,
        aiScore: aiFailed ? -1 : aiResult.relevance,
        aiSummary: aiFailed
          ? `【待确认】${item.title.slice(0, 40)}`
          : (aiResult.summary || aiResult.reason),
        isNotified: true, // 无论 AI 结果如何，都标记为已通知
      },
    })

    // AI 明确判断为不相关：不通知
    if (aiFiltered) {
      console.log(`[Scheduler] Filtered (relevance=${aiResult.relevance.toFixed(2)}): ${item.title}`)
      continue
    }

    // AI 验证通过 或 AI 失败（发"待确认"通知）
    const notifTitle = aiFailed
      ? `📌 "${monitor.keyword}" 新内容（待确认）`
      : `🔥 "${monitor.keyword}" 新热点`

    const notifBody = aiFailed
      ? item.title
      : (aiResult.summary || item.title)

    // 防止重复通知（同一 URL 24 小时内只通知一次）
    const existingNotif = await prisma.notification.findFirst({
      where: { url: item.url, createdAt: { gte: new Date(Date.now() - 86400000) } },
    })
    if (existingNotif) {
      console.log(`[Scheduler] Skip duplicate notification for: ${item.url}`)
      continue
    }

    const notif = await prisma.notification.create({
      data: { title: notifTitle, body: notifBody, type: 'monitor', url: item.url },
    })

    pushNotification({ id: notif.id, title: notifTitle, body: notifBody, url: item.url, type: 'monitor' })

    if (!aiFailed) {
      await sendNotificationEmail({
        subject: `"${monitor.keyword}" 新热点`,
        title: item.title,
        body: aiResult.summary || item.content.slice(0, 200),
        url: item.url,
        source: item.source,
      })
    }

    notifiedCount++
    console.log(`[Scheduler] Notified (ai=${aiFailed ? 'failed' : 'ok'}): ${item.title}`)
  }

  await prisma.monitor.update({ where: { id: monitorId }, data: { lastChecked: new Date() } })
  return { foundCount: itemsToProcess.length, notifiedCount }
}

/**
 * 扫描所有活跃的监控任务
 */
export async function scanAllMonitors(): Promise<void> {
  const monitors = await prisma.monitor.findMany({ where: { isActive: true } })
  console.log(`[Scheduler] Running scan for ${monitors.length} monitors`)

  for (const monitor of monitors) {
    try {
      const { foundCount, notifiedCount } = await scanMonitor(monitor.id)
      console.log(`[Scheduler] Monitor "${monitor.keyword}": found=${foundCount} notified=${notifiedCount}`)
      await new Promise(r => setTimeout(r, 3000))
    } catch (err) {
      console.error(`[Scheduler] Error scanning monitor ${monitor.id}:`, err)
    }
  }
}

/**
 * 热点自动发现
 */
export async function discoverHotspots(): Promise<void> {
  const settingRow = await prisma.setting.findUnique({ where: { key: 'discovery_domains' } })
  const domains: string[] = settingRow
    ? JSON.parse(settingRow.value)
    : ['AI 编程', '大模型', 'AI Agent']

  console.log(`[Scheduler] Discovering hotspots for domains: ${domains.join(', ')}`)

  for (const domain of domains) {
    try {
      const items = await aggregateTrending(domain)
      if (items.length === 0) continue

      const existingUrls = new Set(
        (await prisma.hotSpot.findMany({
          where: { domain, createdAt: { gte: new Date(Date.now() - 86400000) } },
          select: { url: true },
        })).map(h => h.url)
      )

      const newItems = items.filter(i => !existingUrls.has(i.url)).slice(0, 10)
      if (newItems.length === 0) continue

      // AI 批量打分（只取前5条减少调用）
      const toScore = newItems.slice(0, 5)
      let scored: Array<{ id: string; score: number; summary: string }> = []
      try {
        scored = await scoreHotspots(
          toScore.map((item, idx) => ({ id: String(idx), title: item.title, content: item.content }))
        )
      } catch {
        // AI 失败时给默认分
        scored = toScore.map((_, idx) => ({ id: String(idx), score: 5, summary: '' }))
      }

      const scoreMap = new Map(scored.map(s => [s.id, s]))

      for (let i = 0; i < toScore.length; i++) {
        const item = toScore[i]
        const aiScore = scoreMap.get(String(i))
        const heatScore = aiScore?.score ?? 5

        if (heatScore < 3) continue

        await prisma.hotSpot.create({
          data: {
            title: item.title,
            summary: aiScore?.summary || item.content.slice(0, 100),
            url: item.url,
            source: item.source,
            author: item.author || '',
            domain,
            heatScore,
            publishedAt: item.publishedAt,
          },
        })
      }

      await prisma.hotSpot.deleteMany({
        where: { domain, createdAt: { lt: new Date(Date.now() - 7 * 86400000) } },
      })
    } catch (err) {
      console.error(`[Scheduler] Error discovering hotspots for "${domain}":`, err)
    }
  }
}

/**
 * 启动定时任务
 */
export function startScheduler(): void {
  if (isInitialized) return
  isInitialized = true

  cron.schedule('*/15 * * * *', async () => { await scanAllMonitors() })
  cron.schedule('0 * * * *', async () => { await discoverHotspots() })

  console.log('[Scheduler] Started: monitors every 15min, hotspots every 1h')

  setTimeout(async () => {
    await scanAllMonitors()
    await discoverHotspots()
  }, 5000)
}

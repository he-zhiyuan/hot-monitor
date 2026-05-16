import cron from 'node-cron'
import { prisma } from './prisma'
import { aggregateSearch, aggregateTrending } from './sources'
import { expandMonitorKeyword, verifyContent, scoreHotspots, type AIVerifyResult } from './openrouter'
import { defaultMinRelevanceFromEnv } from './monitor-thresholds'
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

  const isAccount = monitor.keyword.trimStart().startsWith('@')
  console.log(`[Scheduler] Scanning monitor: "${monitor.keyword}"${isAccount ? ' (account mode)' : ''}`)

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

  // 账号模式取更多条（用户想看完整投稿列表），普通模式取前5条
  const itemsToProcess = newItems.slice(0, isAccount ? 10 : 5)
  console.log(`[Scheduler] Found ${itemsToProcess.length} new items for "${monitor.keyword}"`)

  let notifiedCount = 0

  const minRel =
    typeof monitor.minRelevance === 'number' && Number.isFinite(monitor.minRelevance)
      ? monitor.minRelevance
      : defaultMinRelevanceFromEnv()

  let queryExpansionJson = monitor.queryExpansion
  if (!isAccount && !queryExpansionJson?.trim()) {
    const exp = await expandMonitorKeyword(monitor.keyword)
    queryExpansionJson = JSON.stringify(exp)
    await prisma.monitor.update({
      where: { id: monitorId },
      data: { queryExpansion: queryExpansionJson },
    })
  }

  for (const item of itemsToProcess) {
    let aiResult: AIVerifyResult = {
      isReal: true,
      relevance: 1,
      summary: '',
      reason: '',
      entityMatch: 'primary',
      evidence: '',
    }
    let aiFailed = false
    let aiFiltered = false

    if (isAccount) {
      aiResult = {
        isReal: true,
        relevance: 1,
        summary: item.content.slice(0, 100),
        reason: '',
        entityMatch: 'primary',
        evidence: '',
      }
    } else {
      await new Promise(r => setTimeout(r, 5000))
      aiResult = await verifyContent(monitor.keyword, item.title, item.content, {
        queryExpansionJson,
      })
      aiFailed = aiResult.relevance === 0 && !aiResult.isReal && aiResult.reason === 'AI 分析失败'
      // 非失败：内容不够真实或相关度低于监控阈值 → 不推送（仍写入 Finding）
      aiFiltered = !aiFailed && (!aiResult.isReal || aiResult.relevance < minRel)
    }

    const entityLabel: Record<string, string> = {
      primary: '主命中（监控对象）',
      related_product: '同品牌/生态但非目标对象',
      tangential: '弱相关',
      unrelated: '不相关',
    }
    const reasonBlock = isAccount
      ? '账号模式：跳过 AI 相关性审核'
      : [
          !aiFailed ? `匹配层级：${entityLabel[aiResult.entityMatch] ?? aiResult.entityMatch}` : '',
          aiResult.reason,
          aiResult.evidence ? `依据：${aiResult.evidence}` : '',
        ]
          .filter(Boolean)
          .join('\n')

    await prisma.finding.create({
      data: {
        monitorId,
        title: item.title,
        content: item.content.slice(0, 2000),
        url: item.url,
        source: item.source,
        author: item.author || '',
        publishedAt: item.publishedAt,
        likes: item.likes ?? null,
        comments: item.comments ?? null,
        shares: item.shares ?? null,
        views: item.views ?? null,
        aiScore: aiFailed ? -1 : aiResult.relevance,
        aiSummary: aiFailed
          ? `【待确认】${item.title.slice(0, 40)}`
          : (aiResult.summary || item.title),
        aiReason: aiFailed ? 'AI 调用失败，请人工查看原文' : reasonBlock,
        isNotified: true,
      },
    })

    if (aiFiltered) {
      console.log(
        `[Scheduler] Filtered (rel=${aiResult.relevance.toFixed(2)} min=${minRel.toFixed(2)} real=${aiResult.isReal} entity=${aiResult.entityMatch}): ${item.title}`
      )
      continue
    }

    // 通知
    const notifTitle = isAccount
      ? `📢 ${monitor.keyword} 有新内容`
      : aiFailed
        ? `📌 "${monitor.keyword}" 新内容（待确认）`
        : `🔥 "${monitor.keyword}" 新热点`

    const notifBody = isAccount
      ? item.title
      : aiFailed
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
            likes: item.likes ?? null,
            comments: item.comments ?? null,
            shares: item.shares ?? null,
            views: item.views ?? null,
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

import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { discoverHotspots } from '../lib/scheduler'

const router = Router()

// GET /api/hotspots
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      domain, page = '1', limit = '30', sort = 'heat',
      source, heatLevel, timeRange, language,
    } = req.query

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const where: any = {}
    if (domain) where.domain = domain

    // 来源平台筛选
    if (source && source !== 'all') where.source = source as string

    // 热度段位筛选
    if (heatLevel === 'high')   where.heatScore = { gte: 8 }
    if (heatLevel === 'medium') where.heatScore = { gte: 5, lt: 8 }
    if (heatLevel === 'low')    where.heatScore = { lt: 5 }

    // 时间范围筛选（基于 createdAt）
    if (timeRange && timeRange !== 'all') {
      const hoursMap: Record<string, number> = { '6h': 6, today: 24, '48h': 48, '7d': 168 }
      const hours = hoursMap[timeRange as string]
      if (hours) where.createdAt = { gte: new Date(Date.now() - hours * 3600 * 1000) }
    }

    // 语言筛选（通过标题字符判断：含中文字符 → 中文，否则 → 英文）
    // 此筛选在数据库层面无法精确处理，使用后处理方式
    const isLanguageFilter = language && language !== 'all'

    const orderBy =
      sort === 'heat'        ? [{ heatScore: 'desc' as const }, { createdAt: 'desc' as const }]
      : sort === 'time'      ? { createdAt: 'desc' as const }
      : sort === 'published' ? [{ publishedAt: 'desc' as const }, { createdAt: 'desc' as const }]
      : sort === 'sources'   ? [{ sourceCount: 'desc' as const }, { heatScore: 'desc' as const }]
      : [{ heatScore: 'desc' as const }, { createdAt: 'desc' as const }]

    const [rawHotspots, total] = await Promise.all([
      prisma.hotSpot.findMany({
        where,
        orderBy,
        // 若有语言筛选多取一些，后处理过滤
        skip: isLanguageFilter ? 0 : skip,
        take: isLanguageFilter ? 500 : parseInt(limit as string),
      }),
      prisma.hotSpot.count({ where }),
    ])

    let hotspots = rawHotspots
    if (isLanguageFilter) {
      const zhRegex = /[\u4e00-\u9fa5]/
      hotspots = hotspots.filter(h =>
        language === 'zh' ? zhRegex.test(h.title) : !zhRegex.test(h.title)
      )
      hotspots = hotspots.slice(skip, skip + parseInt(limit as string))
    }

    res.json({ success: true, data: hotspots, total, page: parseInt(page as string) })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// GET /api/hotspots/domains
router.get('/domains', async (_req: Request, res: Response) => {
  try {
    const domains = await prisma.hotSpot.findMany({
      select: { domain: true },
      distinct: ['domain'],
    })
    res.json({ success: true, data: domains.map(d => d.domain) })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// POST /api/hotspots/refresh  手动刷新热点
router.post('/refresh', async (_req: Request, res: Response) => {
  try {
    discoverHotspots().catch(console.error)
    res.json({ success: true, message: '热点发现任务已启动' })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// PATCH /api/hotspots/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { isRead, isSaved } = req.body
    const hotspot = await prisma.hotSpot.update({
      where: { id: String(req.params.id) },
      data: {
        ...(isRead !== undefined && { isRead }),
        ...(isSaved !== undefined && { isSaved }),
      },
    })
    res.json({ success: true, data: hotspot })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// POST /api/hotspots/read-all
router.post('/read-all', async (_req: Request, res: Response) => {
  try {
    await prisma.hotSpot.updateMany({ data: { isRead: true } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

export default router

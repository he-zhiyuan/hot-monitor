import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { discoverHotspots } from '../lib/scheduler'

const router = Router()

// GET /api/hotspots
router.get('/', async (req: Request, res: Response) => {
  try {
    const { domain, page = '1', limit = '30', sort = 'heat' } = req.query
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const where: any = {}
    if (domain) where.domain = domain

    const [hotspots, total] = await Promise.all([
      prisma.hotSpot.findMany({
        where,
        orderBy: sort === 'heat'
          ? [{ heatScore: 'desc' }, { createdAt: 'desc' }]
          : { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.hotSpot.count({ where }),
    ])

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

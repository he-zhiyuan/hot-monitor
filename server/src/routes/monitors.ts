import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { scanMonitor } from '../lib/scheduler'
import { expandMonitorKeyword } from '../lib/openrouter'
import { clampMinRelevance } from '../lib/monitor-thresholds'

const router = Router()

// GET /api/monitors
router.get('/', async (_req: Request, res: Response) => {
  try {
    const monitors = await prisma.monitor.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { findings: true } },
        findings: {
          where: { isNotified: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, aiSummary: true },
        },
      },
    })
    res.json({ success: true, data: monitors })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// POST /api/monitors
router.post('/', async (req: Request, res: Response) => {
  try {
    const { keyword, description, intervalMin, minRelevance } = req.body
    if (!keyword?.trim()) {
      res.status(400).json({ success: false, error: '关键词不能为空' })
      return
    }
    const kw = keyword.trim()
    const expansion = await expandMonitorKeyword(kw)
    const mr = clampMinRelevance(minRelevance)

    const monitor = await prisma.monitor.create({
      data: {
        keyword: kw,
        description: description?.trim(),
        intervalMin: intervalMin || 15,
        queryExpansion: JSON.stringify(expansion),
        ...(mr !== undefined ? { minRelevance: mr } : {}),
      },
    })
    res.json({ success: true, data: monitor })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// GET /api/monitors/:id/findings
router.get('/:id/findings', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const findings = await prisma.finding.findMany({
      where: { monitorId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    res.json({ success: true, data: findings })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// PATCH /api/monitors/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const { isActive, keyword, description, intervalMin, minRelevance } = req.body

    const prev = await prisma.monitor.findUnique({ where: { id } })
    if (!prev) {
      res.status(404).json({ success: false, error: '监控不存在' })
      return
    }

    const kw = keyword?.trim()
    const keywordChanged = kw && kw !== prev.keyword

    let queryExpansion: string | undefined
    if (keywordChanged) {
      const expansion = await expandMonitorKeyword(kw)
      queryExpansion = JSON.stringify(expansion)
    }

    const mr = clampMinRelevance(minRelevance)

    const monitor = await prisma.monitor.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(kw && { keyword: kw }),
        ...(description !== undefined && { description }),
        ...(intervalMin && { intervalMin }),
        ...(queryExpansion !== undefined && { queryExpansion }),
        ...(mr !== undefined && { minRelevance: mr }),
      },
    })
    res.json({ success: true, data: monitor })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// DELETE /api/monitors/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.monitor.delete({ where: { id: String(req.params.id) } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// POST /api/monitors/:id/scan  手动触发扫描
router.post('/:id/scan', async (req: Request, res: Response) => {
  try {
    const result = await scanMonitor(String(req.params.id))
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// POST /api/monitors/:id/refresh-expansion  仅刷新 query expansion
router.post('/:id/refresh-expansion', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const prev = await prisma.monitor.findUnique({ where: { id } })
    if (!prev) {
      res.status(404).json({ success: false, error: '监控不存在' })
      return
    }
    const expansion = await expandMonitorKeyword(prev.keyword)
    const monitor = await prisma.monitor.update({
      where: { id },
      data: { queryExpansion: JSON.stringify(expansion) },
    })
    res.json({ success: true, data: monitor })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

export default router

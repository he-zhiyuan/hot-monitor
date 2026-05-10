import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

const DEFAULT_SETTINGS: Record<string, string> = {
  discovery_domains: JSON.stringify(['AI 编程', '大模型', 'AI Agent', 'Claude', 'GPT']),
  notify_email: 'true',
  notify_push: 'true',
  monitor_interval: '15',
  hotspot_interval: '60',
}

// GET /api/settings
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.setting.findMany()
    const settings: Record<string, string> = { ...DEFAULT_SETTINGS }
    rows.forEach(r => { settings[r.key] = r.value })
    res.json({ success: true, data: settings })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// PUT /api/settings
router.put('/', async (req: Request, res: Response) => {
  try {
    const updates = req.body as Record<string, string>
    await Promise.all(
      Object.entries(updates).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          create: { key, value: String(value) },
          update: { value: String(value) },
        })
      )
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

export default router

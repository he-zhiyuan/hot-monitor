import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

// GET /api/notifications
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '30' } = req.query
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.notification.count(),
      prisma.notification.count({ where: { isRead: false } }),
    ])

    res.json({ success: true, data: notifications, total, unreadCount })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    await prisma.notification.update({
      where: { id: String(req.params.id) },
      data: { isRead: true },
    })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// POST /api/notifications/read-all
router.post('/read-all', async (_req: Request, res: Response) => {
  try {
    await prisma.notification.updateMany({ data: { isRead: true } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// DELETE /api/notifications/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.notification.delete({ where: { id: String(req.params.id) } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

export default router

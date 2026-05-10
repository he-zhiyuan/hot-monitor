import 'dotenv/config'
import http from 'http'
import express from 'express'
import cors from 'cors'
import monitorsRouter from './routes/monitors'
import hotspotsRouter from './routes/hotspots'
import notificationsRouter from './routes/notifications'
import settingsRouter from './routes/settings'
import { startScheduler } from './lib/scheduler'
import { initSocket } from './lib/socket'

const app = express()
const httpServer = http.createServer(app)
const PORT = parseInt(process.env.PORT || '3001')

// 初始化 Socket.io
initSocket(httpServer)

// 中间件
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 请求日志
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// API 路由
app.use('/api/monitors', monitorsRouter)
app.use('/api/hotspots', hotspotsRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/settings', settingsRouter)

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), version: '1.0.0' })
})

// 手动触发扫描
app.post('/api/scan', async (_req, res) => {
  try {
    const { scanAllMonitors } = await import('./lib/scheduler')
    scanAllMonitors().catch(console.error)
    res.json({ success: true, message: '扫描任务已启动' })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// 404 兜底
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' })
})

// 错误处理
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Express Error]', err)
  res.status(500).json({ success: false, error: err.message })
})

httpServer.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Server] Port ${PORT} already in use. Please kill the other process first.`)
    process.exit(1)
  } else {
    throw err
  }
})

httpServer.listen(PORT, () => {
  console.log(`\n🚀 HotMonitor Server running at http://localhost:${PORT}`)
  console.log(`📡 API: http://localhost:${PORT}/api/health`)
  console.log(`🔌 Socket.io: enabled\n`)
  startScheduler()
})

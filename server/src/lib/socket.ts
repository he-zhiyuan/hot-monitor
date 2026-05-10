import { Server as SocketServer } from 'socket.io'
import type { Server as HttpServer } from 'http'

let io: SocketServer | null = null

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  })

  io.on('connection', socket => {
    console.log(`[Socket] Client connected: ${socket.id}`)
    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`)
    })
  })

  return io
}

export interface NotifyPayload {
  id: string
  title: string
  body: string
  url?: string
  type: string
}

/** 向所有连接的客户端推送新通知 */
export function pushNotification(payload: NotifyPayload): void {
  if (!io) return
  io.emit('notification', payload)
}

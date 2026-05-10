import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAppStore } from '../store'

interface NotifyPayload {
  id: string
  title: string
  body: string
  url?: string
  type: string
}

type NotificationHandler = (payload: NotifyPayload) => void

let socket: Socket | null = null

export function useSocket(onNotification?: NotificationHandler) {
  const { setUnreadCount, unreadCount } = useAppStore()
  const handlerRef = useRef(onNotification)
  handlerRef.current = onNotification

  useEffect(() => {
    if (!socket) {
      socket = io('http://localhost:3001', { transports: ['websocket', 'polling'] })

      socket.on('connect', () => {
        console.log('[Socket] Connected')
      })

      socket.on('disconnect', () => {
        console.log('[Socket] Disconnected')
      })
    }

    const handler = (payload: NotifyPayload) => {
      // 更新未读数
      setUnreadCount(unreadCount + 1)
      // 触发外部回调（显示 Toast）
      handlerRef.current?.(payload)
    }

    socket.on('notification', handler)

    return () => {
      socket?.off('notification', handler)
    }
  }, [])
}

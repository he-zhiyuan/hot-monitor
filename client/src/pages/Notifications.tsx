import { useEffect, useState } from 'react'
import { Bell, CheckCheck, Trash2, ExternalLink } from 'lucide-react'
import TopBar from '../components/layout/TopBar'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { get, post, patch, del } from '../lib/api'
import { useAppStore } from '../store'
import type { Notification } from '../types'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unread, setUnread] = useState(0)
  const { setUnreadCount } = useAppStore()

  const load = async () => {
    setLoading(true)
    try {
      const res = await get<{ success: boolean; data: Notification[]; unreadCount: number }>('/notifications?limit=100')
      setNotifications(res.data)
      setUnread(res.unreadCount)
      setUnreadCount(res.unreadCount)
    } finally {
      setLoading(false)
    }
  }

  const markAllRead = async () => {
    await post('/notifications/read-all')
    load()
  }

  const markRead = async (id: string) => {
    await patch(`/notifications/${id}/read`)
    load()
  }

  const deleteNotif = async (id: string) => {
    await del(`/notifications/${id}`)
    load()
  }

  useEffect(() => { load() }, [])

  return (
    <div className="animate-fade-in">
      <TopBar
        title="通知中心"
        subtitle={`${unread} 条未读`}
        actions={
          unread > 0 ? (
            <Button variant="secondary" size="sm" onClick={markAllRead}>
              <CheckCheck size={14} /> 全部已读
            </Button>
          ) : undefined
        }
      />

      <div className="p-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <Card className="p-16 text-center">
            <Bell size={40} className="text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">暂无通知</p>
            <p className="text-slate-600 text-sm mt-1">当监控到新热点时，通知会出现在这里</p>
          </Card>
        ) : (
          <Card>
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`group flex items-start gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors ${!n.isRead ? 'bg-purple-500/[0.03]' : ''}`}
                >
                  {/* Dot */}
                  <div className="flex-shrink-0 pt-1">
                    <div className={`w-2 h-2 rounded-full ${n.isRead ? 'bg-slate-700' : 'bg-purple-400 animate-pulse'}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-semibold ${n.isRead ? 'text-slate-400' : 'text-slate-200'}`}>
                        {n.title}
                      </span>
                      {!n.isRead && <Badge variant="purple">未读</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{n.body}</p>
                    <span className="text-xs text-slate-700 mt-1 block">{timeAgo(n.createdAt)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {n.url && (
                      <a
                        href={n.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                    {!n.isRead && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                        title="标记已读"
                      >
                        <CheckCheck size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotif(n.id)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

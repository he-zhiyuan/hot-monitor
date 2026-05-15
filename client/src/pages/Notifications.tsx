import { useEffect, useState } from 'react'
import { Bell, CheckCheck, Trash2, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import TopBar from '../components/layout/TopBar'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { get, post, patch, del } from '../lib/api'
import { useAppStore } from '../store'
import type { Notification } from '../types'

const TIME_RANGE_OPTIONS = [
  { value: 'all',   label: 'ALL TIME' },
  { value: 'today', label: '今天' },
  { value: '7d',    label: '7天内' },
]

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading,  setLoading]  = useState(true)
  const [unread,   setUnread]   = useState(0)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [timeRange,  setTimeRange]  = useState('all')
  const { setUnreadCount } = useAppStore()

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (unreadOnly)        params.set('unreadOnly', 'true')
      if (timeRange !== 'all') params.set('timeRange', timeRange)
      const res = await get<{ success: boolean; data: Notification[]; unreadCount: number }>(`/notifications?${params}`)
      setNotifications(res.data)
      setUnread(res.unreadCount)
      setUnreadCount(res.unreadCount)
    } finally {
      setLoading(false)
    }
  }

  const markAllRead = async () => { await post('/notifications/read-all'); load() }
  const markRead    = async (id: string) => { await patch(`/notifications/${id}/read`); load() }
  const deleteNotif = async (id: string) => { await del(`/notifications/${id}`); load() }

  useEffect(() => { load() }, [unreadOnly, timeRange])

  return (
    <div className="animate-fade-in">
      <TopBar
        title="通知中心"
        subtitle={`${unread} 条未读`}
        actions={
          unread > 0 ? (
            <Button variant="secondary" size="sm" onClick={markAllRead}>
              <CheckCheck size={13} /> 全部已读
            </Button>
          ) : undefined
        }
      />

      <div className="p-7 space-y-4">
        {/* ── 筛选栏 ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 仅未读切换 */}
          <button
            onClick={() => setUnreadOnly(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all"
            style={{
              background: unreadOnly ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.03)',
              border: '1px solid',
              borderColor: unreadOnly ? 'rgba(34,211,238,0.3)' : 'rgba(255,255,255,0.08)',
              color: unreadOnly ? '#22d3ee' : '#475569',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: unreadOnly ? '#22d3ee' : '#334155' }}
            />
            仅未读
          </button>

          {/* 时间范围 */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            {TIME_RANGE_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => setTimeRange(o.value)}
                className="px-3 py-1.5 text-[10px] font-mono transition-all"
                style={{
                  background: timeRange === o.value ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.02)',
                  color: timeRange === o.value ? '#22d3ee' : '#475569',
                  borderRight: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                {o.label}
              </button>
            ))}
          </div>

          {/* 结果数 */}
          <span className="text-[10px] text-slate-600 font-mono ml-auto">
            {notifications.length} 条
          </span>
        </div>

        {loading ? (
          <Card className="divide-y divide-white/[0.05]">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="px-6 py-4">
                <div className="shimmer h-4 rounded w-3/4 mb-2" />
                <div className="shimmer h-3 rounded w-1/2" />
              </div>
            ))}
          </Card>
        ) : notifications.length === 0 ? (
          <Card className="p-14 text-center">
            <Bell size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-medium mb-1">
              {unreadOnly || timeRange !== 'all' ? '当前筛选条件下暂无通知' : '暂无通知'}
            </p>
            <p className="text-slate-700 text-xs">当监控到新热点时，通知会出现在这里</p>
          </Card>
        ) : (
          <Card>
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {notifications.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`group flex items-start gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors ${
                    !n.isRead ? 'bg-cyan-500/[0.03]' : ''
                  }`}
                >
                  {/* Dot */}
                  <div className="flex-shrink-0 pt-[5px]">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      n.isRead ? 'bg-slate-700' : 'bg-cyan-400 animate-pulse-slow'
                    }`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[13px] font-semibold ${n.isRead ? 'text-slate-500' : 'text-slate-200'}`}>
                        {n.title}
                      </span>
                      {!n.isRead && <Badge variant="cyan">NEW</Badge>}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{n.body}</p>
                    <span className="text-[10px] text-slate-700 mt-1 block font-mono">{timeAgo(n.createdAt)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {n.url && (
                      <a href={n.url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                    {!n.isRead && (
                      <button onClick={() => markRead(n.id)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        title="标记已读"
                      >
                        <CheckCheck size={13} />
                      </button>
                    )}
                    <button onClick={() => deleteNotif(n.id)}
                      className="p-1.5 rounded-lg text-slate-700 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="删除"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

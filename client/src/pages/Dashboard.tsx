import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Radar, Bell, Zap, ArrowRight, RefreshCw } from 'lucide-react'
import TopBar from '../components/layout/TopBar'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import HotspotCard from '../components/hotspots/HotspotCard'
import { get, post } from '../lib/api'
import { useAppStore } from '../store'
import type { Monitor, HotSpot, Notification } from '../types'

interface Stats {
  monitors: number
  activeMonitors: number
  hotspots: number
  unread: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ monitors: 0, activeMonitors: 0, hotspots: 0, unread: 0 })
  const [topHotspots, setTopHotspots] = useState<HotSpot[]>([])
  const [recentNotifs, setRecentNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { setUnreadCount } = useAppStore()

  const load = async () => {
    try {
      const [monitorsRes, hotspotsRes, notifsRes] = await Promise.all([
        get<{ success: boolean; data: Monitor[] }>('/monitors'),
        get<{ success: boolean; data: HotSpot[]; total: number }>('/hotspots?limit=6&sort=heat'),
        get<{ success: boolean; data: Notification[]; unreadCount: number }>('/notifications?limit=5'),
      ])
      const monitors = monitorsRes.data
      setStats({
        monitors: monitors.length,
        activeMonitors: monitors.filter(m => m.isActive).length,
        hotspots: hotspotsRes.total,
        unread: notifsRes.unreadCount,
      })
      setTopHotspots(hotspotsRes.data)
      setRecentNotifs(notifsRes.data)
      setUnreadCount(notifsRes.unreadCount)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await post('/hotspots/refresh')
    setTimeout(() => { load(); setRefreshing(false) }, 2000)
  }

  useEffect(() => { load() }, [])

  const statCards = [
    { label: '活跃监控', value: stats.activeMonitors, total: stats.monitors, icon: Radar, color: 'purple', suffix: `/ ${stats.monitors}` },
    { label: '今日热点', value: stats.hotspots, icon: TrendingUp, color: 'cyan', suffix: '条' },
    { label: '未读通知', value: stats.unread, icon: Bell, color: 'amber', suffix: '条' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="animate-fade-in">
      <TopBar
        title="仪表板"
        subtitle="实时掌握 AI 热点动态"
        actions={
          <Button variant="secondary" size="sm" loading={refreshing} onClick={handleRefresh}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> 刷新热点
          </Button>
        }
      />

      <div className="p-8 space-y-8">
        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-4">
          {statCards.map(({ label, value, icon: Icon, color, suffix }) => (
            <Card key={label} glow={color as any} className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: color === 'purple'
                      ? 'rgba(124,58,237,0.15)'
                      : color === 'cyan'
                      ? 'rgba(6,182,212,0.15)'
                      : 'rgba(245,158,11,0.15)',
                  }}
                >
                  <Icon
                    size={20}
                    className={
                      color === 'purple' ? 'text-purple-400'
                      : color === 'cyan' ? 'text-cyan-400'
                      : 'text-amber-400'
                    }
                  />
                </div>
              </div>
              <div className="text-3xl font-bold text-white font-mono mb-1">{value}</div>
              <div className="text-sm text-slate-500">{label} <span className="text-slate-600">{suffix}</span></div>
            </Card>
          ))}
        </div>

        {/* Top Hotspots */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-slate-300">最新热点 TOP 6</h2>
            </div>
            <Link to="/hotspots" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
              查看全部 <ArrowRight size={12} />
            </Link>
          </div>
          {topHotspots.length === 0 ? (
            <Card className="p-8 text-center">
              <TrendingUp size={32} className="text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">暂无热点数据</p>
              <p className="text-xs text-slate-600 mt-1">点击"刷新热点"立即发现</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {topHotspots.map(h => (
                <HotspotCard key={h.id} hotspot={h} onRefresh={load} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Notifications */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-purple-400" />
              <h2 className="text-sm font-semibold text-slate-300">最新通知</h2>
            </div>
            <Link to="/notifications" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
              查看全部 <ArrowRight size={12} />
            </Link>
          </div>
          <Card>
            {recentNotifs.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={28} className="text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">暂无通知</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                {recentNotifs.map(n => (
                  <div key={n.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-white/2 transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.isRead ? 'bg-slate-700' : 'bg-purple-400 animate-pulse'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${n.isRead ? 'text-slate-400' : 'text-slate-200'}`}>{n.title}</p>
                      <p className="text-xs text-slate-600 mt-0.5 truncate">{n.body}</p>
                    </div>
                    <Badge variant={n.isRead ? 'gray' : 'purple'}>{n.isRead ? '已读' : '未读'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

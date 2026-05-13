import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Radar, Bell, Zap, ArrowUpRight, RefreshCw, Activity } from 'lucide-react'
import { motion } from 'framer-motion'
import TopBar from '../components/layout/TopBar'
import SpotlightCard from '../components/ui/SpotlightCard'
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

function CountUp({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start: number | null = null
    const step = (ts: number) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [value, duration])
  return <>{display}</>
}

/** Skeleton shimmer block */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`shimmer rounded-lg ${className}`} />
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
    {
      label: '活跃监控',
      value: stats.activeMonitors,
      sub: `共 ${stats.monitors} 个`,
      icon: Radar,
      color: 'cyan' as const,
      spotColor: 'rgba(34,211,238,0.07)',
    },
    {
      label: '热点总数',
      value: stats.hotspots,
      sub: '已发现热点',
      icon: TrendingUp,
      color: 'amber' as const,
      spotColor: 'rgba(251,191,36,0.07)',
    },
    {
      label: '未读通知',
      value: stats.unread,
      sub: '待查看',
      icon: Bell,
      color: stats.unread > 0 ? 'red' as const : 'gray' as const,
      spotColor: stats.unread > 0 ? 'rgba(248,113,113,0.07)' : 'rgba(255,255,255,0.04)',
    },
  ]

  const iconColor: Record<string, string> = {
    cyan: 'text-cyan-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    gray: 'text-slate-600',
  }
  const numColor: Record<string, string> = {
    cyan: 'text-cyan-300 glow-cyan',
    amber: 'text-amber-300 glow-amber',
    red: 'text-red-300 glow-red',
    gray: 'text-slate-400',
  }

  return (
    <div className="animate-fade-in">
      <TopBar
        title="仪表板"
        subtitle="实时掌握 AI 热点"
        actions={
          <Button variant="ghost" size="sm" loading={refreshing} onClick={handleRefresh}>
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            刷新热点
          </Button>
        }
      />

      <div className="p-7 space-y-7">

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-3 gap-4">
          {loading
            ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)
            : statCards.map(({ label, value, sub, icon: Icon, color, spotColor }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <SpotlightCard spotColor={spotColor} className="p-5 hover:scale-[1.02] transition-transform">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{
                        background: `color-mix(in srgb, currentColor 0%, rgba(255,255,255,0.04) 100%)`,
                        border: '1px solid rgba(255,255,255,0.07)',
                      }}
                    >
                      <Icon size={17} className={iconColor[color]} />
                    </div>
                    <Activity size={11} className="text-slate-700 mt-1" />
                  </div>
                  <div className={`text-[32px] font-bold font-mono leading-none mb-1 ${numColor[color]}`}>
                    <CountUp value={value} />
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">{label}</div>
                  <div className="text-[10px] text-slate-700 font-mono mt-0.5">{sub}</div>
                </SpotlightCard>
              </motion.div>
            ))
          }
        </div>

        {/* ── Main grid: hotspots + notifications ── */}
        <div className="grid grid-cols-3 gap-5">
          {/* Hotspots — 2/3 width */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={13} className="text-amber-400" />
                <span className="text-[12px] font-semibold text-slate-300 uppercase tracking-widest font-mono">
                  热点 TOP 6
                </span>
              </div>
              <Link
                to="/hotspots"
                className="text-[11px] text-cyan-500 hover:text-cyan-300 font-mono flex items-center gap-1 transition-colors"
              >
                VIEW ALL <ArrowUpRight size={11} />
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-36" />)}
              </div>
            ) : topHotspots.length === 0 ? (
              <SpotlightCard className="p-10 text-center">
                <TrendingUp size={28} className="text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-1">暂无热点数据</p>
                <p className="text-xs text-slate-700 mb-5">点击"刷新热点"立即开始发现</p>
                <Button variant="primary" size="sm" loading={refreshing} onClick={handleRefresh}>
                  <Zap size={12} /> 立即发现
                </Button>
              </SpotlightCard>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {topHotspots.map((h, i) => (
                  <HotspotCard key={h.id} hotspot={h} onRefresh={load} index={i} />
                ))}
              </div>
            )}
          </div>

          {/* Notifications — 1/3 width */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={13} className="text-cyan-400" />
                <span className="text-[12px] font-semibold text-slate-300 uppercase tracking-widest font-mono">
                  最新通知
                </span>
              </div>
              <Link
                to="/notifications"
                className="text-[11px] text-cyan-500 hover:text-cyan-300 font-mono flex items-center gap-1 transition-colors"
              >
                ALL <ArrowUpRight size={11} />
              </Link>
            </div>

            <SpotlightCard className="overflow-hidden">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : recentNotifs.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={22} className="text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-600">暂无通知</p>
                </div>
              ) : (
                <div>
                  {recentNotifs.map((n, i) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]"
                      style={{ borderBottom: i < recentNotifs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                        n.isRead ? 'bg-slate-700' : 'bg-cyan-400 animate-pulse-slow'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] font-medium leading-snug line-clamp-2 ${
                          n.isRead ? 'text-slate-500' : 'text-slate-200'
                        }`}>{n.title}</p>
                        {n.body && (
                          <p className="text-[10px] text-slate-600 mt-0.5 truncate">{n.body}</p>
                        )}
                      </div>
                      {!n.isRead && (
                        <Badge variant="cyan" size="sm">NEW</Badge>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </SpotlightCard>
          </div>
        </div>

      </div>
    </div>
  )
}

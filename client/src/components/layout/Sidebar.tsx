import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Radar,
  TrendingUp,
  Bell,
  Settings,
  Activity,
} from 'lucide-react'
import { useAppStore } from '../../store'

const navItems = [
  { to: '/dashboard',     icon: LayoutDashboard, label: '仪表板',    shortLabel: 'Home' },
  { to: '/monitors',      icon: Radar,            label: '关键词监控', shortLabel: 'Monitor' },
  { to: '/hotspots',      icon: TrendingUp,       label: '热点发现',  shortLabel: 'Trends' },
  { to: '/notifications', icon: Bell,             label: '通知中心',  shortLabel: 'Alerts' },
  { to: '/settings',      icon: Settings,         label: '系统设置',  shortLabel: 'Config' },
]

/* Animated radar logo */
function RadarLogo() {
  return (
    <div className="relative w-9 h-9 flex-shrink-0">
      {/* outer ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ border: '1px solid rgba(34,211,238,0.25)' }}
      />
      {/* mid ring */}
      <div
        className="absolute inset-[5px] rounded-full"
        style={{ border: '1px solid rgba(34,211,238,0.15)' }}
      />
      {/* center dot */}
      <div
        className="absolute inset-[13px] rounded-full bg-cyan-400 animate-glow-pulse"
      />
      {/* sweep */}
      <div
        className="absolute inset-0 rounded-full animate-radar origin-center"
        style={{
          background: 'conic-gradient(from 0deg, rgba(34,211,238,0.25) 0deg, transparent 60deg)',
        }}
      />
    </div>
  )
}

export default function Sidebar() {
  const { unreadCount } = useAppStore()

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-[220px] flex flex-col z-30 glass-strong"
      style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* ── Logo ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-[18px] relative overflow-hidden"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* beam behind logo */}
        <div
          className="absolute left-0 top-0 h-full w-32 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at left center, rgba(34,211,238,0.07) 0%, transparent 70%)',
          }}
        />
        <RadarLogo />
        <div className="relative">
          <div className="text-[13px] font-bold text-white tracking-widest uppercase font-mono">
            HotMonitor
          </div>
          <div className="text-[10px] text-cyan-500/70 tracking-wider font-mono mt-0.5">
            AI · RADAR
          </div>
        </div>
      </div>

      {/* ── Nav ──────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 group ${
                isActive
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* active bg */}
                {isActive && (
                  <motion.div
                    layoutId="nav-active-bg"
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: 'rgba(34,211,238,0.08)',
                      border: '1px solid rgba(34,211,238,0.18)',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}

                {/* left accent bar */}
                {isActive && (
                  <motion.div
                    layoutId="nav-accent"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r bg-cyan-400"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}

                <Icon
                  size={15}
                  className={`relative z-10 transition-colors ${
                    isActive
                      ? 'text-cyan-400'
                      : 'text-slate-600 group-hover:text-slate-400'
                  }`}
                />
                <span className="relative z-10">{label}</span>

                {/* notification badge */}
                {label === '通知中心' && unreadCount > 0 && (
                  <AnimatePresence>
                    <motion.span
                      key="badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="relative z-10 ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-black"
                      style={{ background: 'linear-gradient(135deg, #22d3ee, #06b6d4)' }}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </motion.span>
                  </AnimatePresence>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Footer ───────────────────────────────────── */}
      <div
        className="px-4 py-4 space-y-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-2">
          <Activity size={11} className="text-emerald-400" />
          <span className="text-[11px] text-slate-600 font-mono">SYSTEM ONLINE</span>
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow" />
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div
            className="h-full rounded-full animate-shimmer"
            style={{
              width: '65%',
              background: 'linear-gradient(90deg, rgba(34,211,238,0.4), rgba(34,211,238,0.8), rgba(34,211,238,0.4))',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </aside>
  )
}

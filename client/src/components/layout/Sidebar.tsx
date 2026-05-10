import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Radar,
  TrendingUp,
  Bell,
  Settings,
  Zap,
} from 'lucide-react'
import { useAppStore } from '../../store'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: '仪表板' },
  { to: '/monitors', icon: Radar, label: '关键词监控' },
  { to: '/hotspots', icon: TrendingUp, label: '热点发现' },
  { to: '/notifications', icon: Bell, label: '通知中心' },
  { to: '/settings', icon: Settings, label: '系统设置' },
]

export default function Sidebar() {
  const { unreadCount } = useAppStore()

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col z-30"
      style={{
        background: 'rgba(8,12,20,0.95)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
        >
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-white tracking-wide">HotMonitor</div>
          <div className="text-xs text-slate-500">AI 热点雷达</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 relative group ${
                isActive
                  ? 'text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
            style={({ isActive }) =>
              isActive
                ? {
                    background: 'rgba(124,58,237,0.15)',
                    boxShadow: 'inset 0 0 0 1px rgba(124,58,237,0.3)',
                  }
                : {}
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} className={isActive ? 'text-purple-400' : 'text-slate-500 group-hover:text-slate-300'} />
                <span>{label}</span>
                {label === '通知中心' && unreadCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r bg-purple-500" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-500">系统运行中</span>
        </div>
      </div>
    </aside>
  )
}

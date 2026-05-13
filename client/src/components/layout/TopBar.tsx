import { Bell, ChevronRight } from 'lucide-react'
import { useAppStore } from '../../store'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

interface TopBarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

function LiveClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('zh-CN', { hour12: false }))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="font-mono text-[11px] text-slate-600 tabular-nums select-none">
      {time}
    </span>
  )
}

export default function TopBar({ title, subtitle, actions }: TopBarProps) {
  const { unreadCount } = useAppStore()
  const navigate = useNavigate()

  return (
    <header
      className="flex items-center justify-between px-7 py-4"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* left: breadcrumb style title */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-mono text-slate-600 uppercase tracking-widest select-none">
          HOT<span className="text-cyan-600">MONITOR</span>
        </span>
        <ChevronRight size={12} className="text-slate-700" />
        <h1 className="text-[15px] font-semibold text-slate-200">{title}</h1>
        {subtitle && (
          <>
            <span className="text-slate-700 text-xs">·</span>
            <span className="text-xs text-slate-600">{subtitle}</span>
          </>
        )}
      </div>

      {/* right: actions + clock + bell */}
      <div className="flex items-center gap-3">
        {actions}

        <LiveClock />

        <div className="w-px h-4 bg-white/[0.06]" />

        <button
          onClick={() => navigate('/notifications')}
          className="relative p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 transition-colors"
          aria-label="通知中心"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full text-[9px] font-bold text-black leading-none"
              style={{ background: 'linear-gradient(135deg, #22d3ee, #06b6d4)', padding: '0 2px' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}

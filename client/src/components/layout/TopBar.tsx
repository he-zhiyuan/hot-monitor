import { Bell } from 'lucide-react'
import { useAppStore } from '../../store'
import { useNavigate } from 'react-router-dom'

interface TopBarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function TopBar({ title, subtitle, actions }: TopBarProps) {
  const { unreadCount } = useAppStore()
  const navigate = useNavigate()

  return (
    <header className="flex items-center justify-between px-8 py-5 border-b"
      style={{ borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div>
        <h1 className="text-xl font-bold text-slate-100">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-lg text-slate-400 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}

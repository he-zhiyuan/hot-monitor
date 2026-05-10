import { Pause, Play, Trash2, Radar, Zap, Clock, FileSearch, Loader2 } from 'lucide-react'
import { useState } from 'react'
import type { Monitor } from '../../types'
import Badge from '../ui/Badge'
import api from '../../lib/api'

interface Props {
  monitor: Monitor
  onRefresh: () => void
  onClick: () => void
}

const sourceColors: Record<string, string> = {
  twitter: 'cyan',
  hackernews: 'amber',
  github: 'green',
  web: 'gray',
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return '从未'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

export default function MonitorCard({ monitor, onRefresh, onClick }: Props) {
  const [scanning, setScanning] = useState(false)
  const lastFinding = monitor.findings?.[0]

  const toggleActive = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await api.patch(`/monitors/${monitor.id}`, { isActive: !monitor.isActive })
    onRefresh()
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`确定删除监控"${monitor.keyword}"？`)) return
    await api.delete(`/monitors/${monitor.id}`)
    onRefresh()
  }

  const handleScan = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (scanning) return
    setScanning(true)
    try {
      await api.post(`/monitors/${monitor.id}/scan`)
      onRefresh()
    } finally {
      setScanning(false)
    }
  }

  return (
    <div
      onClick={onClick}
      className="group rounded-xl border transition-all duration-300 cursor-pointer hover:scale-[1.01]"
      style={{
        background: monitor.isActive
          ? 'rgba(124,58,237,0.06)'
          : 'rgba(255,255,255,0.02)',
        borderColor: monitor.isActive
          ? 'rgba(124,58,237,0.2)'
          : 'rgba(255,255,255,0.06)',
      }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: monitor.isActive
                  ? 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(79,70,229,0.3))'
                  : 'rgba(255,255,255,0.05)',
              }}
            >
              <Radar
                size={16}
                className={monitor.isActive ? 'text-purple-400 animate-pulse-slow' : 'text-slate-600'}
              />
            </div>
            <div>
              <h3 className="font-semibold text-slate-200 text-sm">{monitor.keyword}</h3>
              {monitor.description && (
                <p className="text-xs text-slate-500 mt-0.5">{monitor.description}</p>
              )}
            </div>
          </div>
          <Badge variant={monitor.isActive ? 'purple' : 'gray'}>
            {monitor.isActive ? '监控中' : '已暂停'}
          </Badge>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <FileSearch size={12} />
            发现 {monitor._count?.findings ?? 0} 条
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={12} />
            {timeAgo(monitor.lastChecked)}
          </span>
          <span className="flex items-center gap-1.5">
            <Zap size={12} />
            每 {monitor.intervalMin} 分钟
          </span>
        </div>

        {/* Last finding */}
        {lastFinding && (
          <div
            className="rounded-lg px-3 py-2.5 mb-4 text-xs"
            style={{ background: 'rgba(255,255,255,0.04)', borderLeft: '2px solid rgba(124,58,237,0.5)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Badge variant={(sourceColors[lastFinding.source] as any) || 'gray'}>
                {lastFinding.source}
              </Badge>
              <span className="text-slate-600">{timeAgo(lastFinding.createdAt)}</span>
            </div>
            <p className="text-slate-400 line-clamp-2">{lastFinding.aiSummary || '...'}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="px-2.5 py-1.5 rounded-lg text-xs text-cyan-400 hover:bg-cyan-500/10 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            title="立即扫描"
          >
            {scanning
              ? <><Loader2 size={12} className="animate-spin" /> 扫描中...</>
              : <><Zap size={12} /> 立即扫描</>
            }
          </button>
          <button
            onClick={toggleActive}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title={monitor.isActive ? '暂停' : '启动'}
          >
            {monitor.isActive ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="删除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

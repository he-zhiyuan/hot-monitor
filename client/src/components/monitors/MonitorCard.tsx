import { Pause, Play, Trash2, Zap, Clock, FileSearch, Loader2, Radar } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Monitor } from '../../types'
import Badge from '../ui/Badge'
import api from '../../lib/api'

interface Props {
  monitor: Monitor
  onRefresh: () => void
  onClick: () => void
  index?: number
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return '从未'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return '刚刚'
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  if (h < 24)    return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function MonitorCard({ monitor, onRefresh, onClick, index = 0 }: Props) {
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      onClick={onClick}
      className="group relative rounded-xl border cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 overflow-hidden"
      style={{
        background: monitor.isActive
          ? 'rgba(34,211,238,0.03)'
          : 'rgba(255,255,255,0.02)',
        borderColor: monitor.isActive
          ? 'rgba(34,211,238,0.15)'
          : 'rgba(255,255,255,0.06)',
        boxShadow: monitor.isActive
          ? '0 0 24px rgba(34,211,238,0.05)'
          : 'none',
      }}
    >
      {/* active glow bg */}
      {monitor.isActive && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at top left, rgba(34,211,238,0.04) 0%, transparent 60%)',
          }}
        />
      )}

      <div className="relative p-5">
        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="relative w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: monitor.isActive
                  ? 'rgba(34,211,238,0.1)'
                  : 'rgba(255,255,255,0.04)',
                border: monitor.isActive
                  ? '1px solid rgba(34,211,238,0.2)'
                  : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <Radar
                size={16}
                className={monitor.isActive ? 'text-cyan-400 animate-pulse-slow' : 'text-slate-600'}
              />
            </div>
            <div>
              <h3 className="font-semibold text-slate-200 text-[13px] tracking-wide">
                {monitor.keyword}
              </h3>
              {monitor.description && (
                <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">{monitor.description}</p>
              )}
            </div>
          </div>
          <Badge variant={monitor.isActive ? 'cyan' : 'gray'}>
            {monitor.isActive ? 'LIVE' : 'PAUSED'}
          </Badge>
        </div>

        {/* ── Stats ── */}
        <div className="flex items-center gap-4 mb-4 font-mono text-[10px] text-slate-600">
          <span className="flex items-center gap-1">
            <FileSearch size={10} />
            {monitor._count?.findings ?? 0} findings
          </span>
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {timeAgo(monitor.lastChecked)}
          </span>
          <span className="flex items-center gap-1">
            <Zap size={10} />
            {monitor.intervalMin}m interval
          </span>
        </div>

        {/* ── Last finding preview ── */}
        {lastFinding && (
          <div
            className="rounded-lg px-3 py-2 mb-4 text-[11px]"
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderLeft: '2px solid rgba(34,211,238,0.3)',
            }}
          >
            <p className="text-slate-400 line-clamp-2 leading-relaxed">
              {lastFinding.aiSummary || lastFinding.title || '...'}
            </p>
          </div>
        )}

        {/* ── Actions ── */}
        <div
          className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-cyan-400 hover:bg-cyan-500/10 transition-colors disabled:opacity-40"
          >
            {scanning
              ? <><Loader2 size={11} className="animate-spin" /> SCANNING</>
              : <><Zap size={11} /> SCAN NOW</>
            }
          </button>
          <button
            onClick={toggleActive}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/8 transition-colors"
            aria-label={monitor.isActive ? '暂停' : '启动'}
          >
            {monitor.isActive ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg text-slate-700 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            aria-label="删除"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

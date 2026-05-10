import { ExternalLink, Bookmark, BookmarkCheck } from 'lucide-react'
import type { HotSpot } from '../../types'
import Badge from '../ui/Badge'
import api from '../../lib/api'

interface Props {
  hotspot: HotSpot
  onRefresh: () => void
}

const sourceLabel: Record<string, string> = {
  twitter: 'X/Twitter',
  hackernews: 'Hacker News',
  github: 'GitHub',
  web: '网络',
}

const sourceBadge: Record<string, 'cyan' | 'amber' | 'green' | 'gray'> = {
  twitter: 'cyan',
  hackernews: 'amber',
  github: 'green',
  web: 'gray',
}

function HeatBar({ score }: { score: number }) {
  const pct = Math.min(100, (score / 10) * 100)
  const color = score >= 8 ? '#ef4444' : score >= 6 ? '#f59e0b' : score >= 4 ? '#7c3aed' : '#475569'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="font-mono text-xs font-bold" style={{ color }}>
        {score.toFixed(1)}
      </span>
    </div>
  )
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  return `${Math.floor(hours / 24)}天前`
}

export default function HotspotCard({ hotspot, onRefresh }: Props) {
  const toggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await api.patch(`/hotspots/${hotspot.id}`, { isSaved: !hotspot.isSaved })
    onRefresh()
  }

  const handleRead = async () => {
    if (!hotspot.isRead) {
      await api.patch(`/hotspots/${hotspot.id}`, { isRead: true })
      onRefresh()
    }
    window.open(hotspot.url, '_blank')
  }

  return (
    <div
      className={`group rounded-xl border transition-all duration-300 hover:scale-[1.005] ${hotspot.isRead ? 'opacity-60' : ''}`}
      style={{
        background: hotspot.heatScore >= 8
          ? 'rgba(239,68,68,0.05)'
          : hotspot.heatScore >= 6
          ? 'rgba(245,158,11,0.05)'
          : 'rgba(255,255,255,0.02)',
        borderColor: hotspot.heatScore >= 8
          ? 'rgba(239,68,68,0.2)'
          : hotspot.heatScore >= 6
          ? 'rgba(245,158,11,0.15)'
          : 'rgba(255,255,255,0.07)',
      }}
    >
      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={sourceBadge[hotspot.source] ?? 'gray'}>
              {sourceLabel[hotspot.source] ?? hotspot.source}
            </Badge>
            <Badge variant="purple">{hotspot.domain}</Badge>
            {!hotspot.isRead && (
              <span className="flex h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
            )}
          </div>
          <span className="text-xs text-slate-600 whitespace-nowrap flex-shrink-0">
            {timeAgo(hotspot.publishedAt || hotspot.createdAt)}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-slate-200 mb-1.5 line-clamp-2 leading-snug">
          {hotspot.title}
        </h3>

        {/* Summary */}
        <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
          {hotspot.summary}
        </p>

        {/* Heat bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-600">热度</span>
            {hotspot.sourceCount > 1 && (
              <span className="text-xs text-slate-600">{hotspot.sourceCount} 个来源</span>
            )}
          </div>
          <HeatBar score={hotspot.heatScore} />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          {hotspot.author && (
            <span className="text-xs text-slate-600 truncate">@{hotspot.author}</span>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={toggleSave}
              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
              title={hotspot.isSaved ? '取消收藏' : '收藏'}
            >
              {hotspot.isSaved
                ? <BookmarkCheck size={14} className="text-amber-400" />
                : <Bookmark size={14} />}
            </button>
            <button
              onClick={handleRead}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ExternalLink size={12} /> 查看
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

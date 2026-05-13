import { ExternalLink, Bookmark, BookmarkCheck, Flame, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import type { HotSpot } from '../../types'
import Badge from '../ui/Badge'
import api from '../../lib/api'

interface Props {
  hotspot: HotSpot
  onRefresh: () => void
  index?: number
}

const sourceLabel: Record<string, string> = {
  twitter:    'X / Twitter',
  hackernews: 'Hacker News',
  github:     'GitHub',
  web:        'Web',
  reddit:     'Reddit',
  devto:      'Dev.to',
  googlenews: 'Google News',
}
const sourceBadge: Record<string, 'cyan' | 'amber' | 'green' | 'gray' | 'red' | 'purple' | 'blue'> = {
  twitter:    'cyan',
  hackernews: 'amber',
  github:     'green',
  web:        'gray',
  reddit:     'red',
  devto:      'purple',
  googlenews: 'blue',
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return '刚刚'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  if (h < 24)    return `${h}h`
  return `${Math.floor(h / 24)}d`
}

/** Circular heat gauge */
function HeatGauge({ score }: { score: number }) {
  const pct  = Math.min(1, score / 10)
  const size = 36
  const r    = 14
  const circ = 2 * Math.PI * r
  const dash = circ * pct
  const color =
    score >= 8 ? '#f87171' :
    score >= 6 ? '#fbbf24' :
    score >= 4 ? '#22d3ee' : '#475569'

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth="2.5"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center font-mono font-bold"
        style={{ fontSize: 9, color, lineHeight: 1 }}
      >
        {score.toFixed(0)}
      </div>
    </div>
  )
}

export default function HotspotCard({ hotspot, onRefresh, index = 0 }: Props) {
  const isHot = hotspot.heatScore >= 8
  const isWarm = hotspot.heatScore >= 6

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

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`group relative rounded-[13px] border transition-all duration-300 hover:scale-[1.008] hover:-translate-y-0.5 ${
        hotspot.isRead ? 'opacity-50' : ''
      }`}
      style={{
        background: isHot
          ? 'rgba(248,113,113,0.04)'
          : isWarm
          ? 'rgba(251,191,36,0.04)'
          : 'rgba(255,255,255,0.025)',
        borderColor: isHot
          ? 'rgba(248,113,113,0.2)'
          : isWarm
          ? 'rgba(251,191,36,0.15)'
          : 'rgba(255,255,255,0.07)',
        boxShadow: isHot
          ? '0 0 30px rgba(248,113,113,0.06)'
          : isWarm
          ? '0 0 30px rgba(251,191,36,0.04)'
          : 'none',
      }}
    >
      <div className="p-4">
        {/* ── Top row ── */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <Badge variant={sourceBadge[hotspot.source] ?? 'gray'}>
              {sourceLabel[hotspot.source] ?? hotspot.source}
            </Badge>
            {hotspot.domain && (
              <Badge variant="ghost">{hotspot.domain}</Badge>
            )}
            {!hotspot.isRead && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-slow flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 text-[10px] text-slate-600 font-mono">
            <Clock size={9} />
            {timeAgo(hotspot.publishedAt || hotspot.createdAt)}
          </div>
        </div>

        {/* ── Content row ── */}
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-semibold text-slate-200 mb-1.5 line-clamp-2 leading-snug">
              {hotspot.title}
            </h3>
            {hotspot.summary && (
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {hotspot.summary}
              </p>
            )}
          </div>
          <HeatGauge score={hotspot.heatScore} />
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between mt-3 pt-2.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-1.5">
            {isHot && (
              <span className="flex items-center gap-1 text-[10px] text-red-400 font-mono">
                <Flame size={10} className="animate-pulse-slow" /> TRENDING
              </span>
            )}
            {hotspot.sourceCount > 1 && !isHot && (
              <span className="text-[10px] text-slate-600 font-mono">
                {hotspot.sourceCount} sources
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleSave}
              className="p-1.5 rounded-md text-slate-600 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
              aria-label={hotspot.isSaved ? '取消收藏' : '收藏'}
            >
              {hotspot.isSaved
                ? <BookmarkCheck size={13} className="text-amber-400" />
                : <Bookmark size={13} />
              }
            </button>
            <button
              onClick={handleRead}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-slate-400 hover:text-white hover:bg-white/8 transition-colors font-mono"
            >
              <ExternalLink size={10} /> OPEN
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )

  if (!isHot) return card

  return (
    <div className="moving-border-wrap">
      <div className="moving-border-inner">{card}</div>
    </div>
  )
}

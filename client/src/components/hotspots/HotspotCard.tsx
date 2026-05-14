import { ExternalLink, Bookmark, BookmarkCheck, Flame, Globe } from 'lucide-react'
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
  bilibili:   'B站',
  baidu:      '百度',
  '36kr':     '36氪',
  sspai:      '少数派',
}
const sourceBadge: Record<string, 'cyan' | 'amber' | 'green' | 'gray' | 'red' | 'purple' | 'blue' | 'pink'> = {
  twitter:    'cyan',
  hackernews: 'amber',
  github:     'green',
  web:        'gray',
  reddit:     'red',
  devto:      'purple',
  googlenews: 'blue',
  bilibili:   'pink',
  baidu:      'blue',
  '36kr':     'green',
  sspai:      'amber',
}

/**
 * 格式化发布时间：
 * < 1h   → "X分钟前"
 * < 24h  → "X小时前"
 * < 7d   → "X天前"
 * else   → "M月D日 HH:mm"
 */
function formatTime(dateStr?: string): { relative: string; absolute: string } {
  if (!dateStr) return { relative: '时间未知', absolute: '' }
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)

  let relative: string
  if (mins < 1)         relative = '刚刚'
  else if (mins < 60)   relative = `${mins}分钟前`
  else if (hours < 24)  relative = `${hours}小时前`
  else if (days < 7)    relative = `${days}天前`
  else                  relative = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })

  const absolute = date.toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })

  return { relative, absolute }
}

/** 圆环热度仪表 + 明显数值 */
function HeatDisplay({ score }: { score: number }) {
  const pct   = Math.min(1, score / 10)
  const size  = 44
  const r     = 17
  const circ  = 2 * Math.PI * r
  const dash  = circ * pct
  const color =
    score >= 8 ? '#f87171' :
    score >= 6 ? '#fbbf24' :
    score >= 4 ? '#22d3ee' : '#475569'
  const label =
    score >= 8 ? '高热' :
    score >= 6 ? '中热' :
    score >= 4 ? '一般' : '低热'

  return (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
      {/* 圆环 */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth="3"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 5px ${color}80)` }}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center font-mono font-bold"
          style={{ fontSize: 11, color, lineHeight: 1 }}
        >
          {score % 1 === 0 ? score.toFixed(0) : score.toFixed(1)}
        </div>
      </div>
      {/* 等级标签 */}
      <span className="text-[9px] font-mono font-semibold" style={{ color, opacity: 0.85 }}>
        {label}
      </span>
    </div>
  )
}

export default function HotspotCard({ hotspot, onRefresh, index = 0 }: Props) {
  const isHot  = hotspot.heatScore >= 8
  const isWarm = hotspot.heatScore >= 6

  const time = formatTime(hotspot.publishedAt || hotspot.createdAt)
  const hasPublishedAt = !!hotspot.publishedAt

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
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className={`group relative rounded-[13px] border transition-all duration-300 hover:scale-[1.008] hover:-translate-y-0.5 ${
        hotspot.isRead ? 'opacity-50 hover:opacity-70' : ''
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
        {/* ── 顶部：来源 + 域名 + 时间 ── */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
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

          {/* 时间：悬浮显示精确时间 */}
          <div
            className="flex-shrink-0 text-right cursor-default"
            title={time.absolute}
          >
            <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
              {time.relative}
            </span>
            {!hasPublishedAt && (
              <span className="text-[9px] text-slate-700 font-mono block">入库时间</span>
            )}
          </div>
        </div>

        {/* ── 主体：标题 + 热度仪表 ── */}
        <div className="flex gap-3 mb-2.5">
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
          <HeatDisplay score={hotspot.heatScore} />
        </div>

        {/* ── 底部：热度 badge + 多源数 + 操作 ── */}
        <div className="flex items-center justify-between pt-2.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-2">
            {isHot && (
              <span className="flex items-center gap-1 text-[10px] text-red-400 font-mono">
                <Flame size={10} className="animate-pulse-slow" /> TRENDING
              </span>
            )}
            {hotspot.sourceCount > 1 && (
              <span className="flex items-center gap-1 text-[10px] font-mono"
                style={{ color: hotspot.sourceCount >= 3 ? '#fbbf24' : '#475569' }}
              >
                <Globe size={9} />
                {hotspot.sourceCount} 源
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

import { useEffect, useState } from 'react'
import { TrendingUp, RefreshCw, CheckCheck, Bookmark, X, SlidersHorizontal, ChevronLeft, ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import TopBar from '../components/layout/TopBar'
import HotspotCard from '../components/hotspots/HotspotCard'
import Button from '../components/ui/Button'
import { get, post } from '../lib/api'
import type { HotSpot } from '../types'

// ─── 常量 ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

const SORT_OPTIONS = [
  { value: 'heat',      label: '热度' },
  { value: 'time',      label: '入库时间' },
  { value: 'published', label: '发布时间' },
  { value: 'sources',   label: '多源引用' },
]

const SOURCE_OPTIONS = [
  { value: 'all',        label: 'ALL' },
  { value: 'twitter',    label: 'X / Twitter' },
  { value: 'hackernews', label: 'HN' },
  { value: 'github',     label: 'GitHub' },
  { value: 'reddit',     label: 'Reddit' },
  { value: 'devto',      label: 'Dev.to' },
  { value: 'googlenews', label: 'Google News' },
  { value: 'bilibili',   label: 'B站' },
  { value: 'baidu',      label: '百度' },
  { value: '36kr',       label: '36氪' },
  { value: 'sspai',      label: '少数派' },
  { value: 'web',        label: 'Web' },
]

const HEAT_OPTIONS = [
  { value: 'all',    label: 'ALL' },
  { value: 'high',   label: '🔥 高热 ≥8' },
  { value: 'medium', label: '💡 中热 5-8' },
  { value: 'low',    label: '📄 一般 <5' },
]

const TIME_OPTIONS = [
  { value: 'all',   label: 'ALL TIME' },
  { value: '6h',    label: '6H' },
  { value: 'today', label: '今天' },
  { value: '48h',   label: '48H' },
  { value: '7d',    label: '7D' },
]

const LANG_OPTIONS = [
  { value: 'all', label: 'ALL LANG' },
  { value: 'zh',  label: '中文' },
  { value: 'en',  label: 'EN' },
]

// ─── Pill 按钮组 ─────────────────────────────────────────────────────────────

interface PillGroupProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}

function PillGroup<T extends string>({ options, value, onChange }: PillGroupProps<T>) {
  return (
    <div className="flex rounded-lg overflow-hidden flex-shrink-0"
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className="px-2.5 py-1.5 text-[10px] font-mono transition-all whitespace-nowrap"
          style={{
            background: value === o.value ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.02)',
            color: value === o.value ? '#22d3ee' : '#475569',
            borderRight: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ─── 分页组件 ─────────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (p: number) => void
}

function Pagination({ page, totalPages, total, pageSize, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end   = Math.min(page * pageSize, total)

  // 生成页码列表（最多显示 7 个）
  const pages: (number | '…')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3)            pages.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('…')
    pages.push(totalPages)
  }

  return (
    <div className="flex items-center justify-between mt-6 pt-4"
      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      <span className="text-[11px] text-slate-600 font-mono">
        {start}–{end} / {total} 条
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all disabled:opacity-25 disabled:cursor-not-allowed text-slate-400 hover:text-white hover:bg-white/8"
        >
          <ChevronLeft size={13} />
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-[11px] text-slate-600 font-mono">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-mono transition-all"
              style={{
                background: page === p ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.02)',
                color: page === p ? '#22d3ee' : '#475569',
                border: page === p ? '1px solid rgba(34,211,238,0.3)' : '1px solid transparent',
              }}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all disabled:opacity-25 disabled:cursor-not-allowed text-slate-400 hover:text-white hover:bg-white/8"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      {/* 跳页输入 */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-slate-600 font-mono">跳至</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          defaultValue={page}
          key={page}
          onBlur={e => {
            const v = parseInt(e.target.value)
            if (v >= 1 && v <= totalPages) onPageChange(v)
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const v = parseInt((e.target as HTMLInputElement).value)
              if (v >= 1 && v <= totalPages) onPageChange(v)
            }
          }}
          className="w-12 text-center px-1 py-1 rounded-lg text-[11px] font-mono text-slate-300 border outline-none focus:border-cyan-500/40 transition-all"
          style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
        />
        <span className="text-[10px] text-slate-600 font-mono">/ {totalPages}</span>
      </div>
    </div>
  )
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────

export default function Hotspots() {
  const [hotspots, setHotspots]   = useState<HotSpot[]>([])
  const [domains,  setDomains]    = useState<string[]>([])
  const [domain,   setDomain]     = useState('')
  const [sort,     setSort]       = useState('heat')
  const [status,   setStatus]     = useState<'all' | 'unread' | 'saved'>('all')
  const [source,   setSource]     = useState('all')
  const [heatLevel, setHeatLevel] = useState('all')
  const [timeRange, setTimeRange] = useState('all')
  const [language,  setLanguage]  = useState('all')
  const [loading,   setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [expandAllAi, setExpandAllAi] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const activeFilterCount = [
    source    !== 'all',
    heatLevel !== 'all',
    timeRange !== 'all',
    language  !== 'all',
  ].filter(Boolean).length

  const clearExtraFilters = () => {
    setSource('all')
    setHeatLevel('all')
    setTimeRange('all')
    setLanguage('all')
  }

  // 筛选条件变化时重置到第一页（用于各 onChange 回调）
  const resetPage = () => setPage(1)

  const load = async (targetPage = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        sort,
        limit: String(PAGE_SIZE),
        page:  String(targetPage),
      })
      if (domain)                params.set('domain',    domain)
      if (source    !== 'all')   params.set('source',    source)
      if (heatLevel !== 'all')   params.set('heatLevel', heatLevel)
      if (timeRange !== 'all')   params.set('timeRange', timeRange)
      if (language  !== 'all')   params.set('language',  language)

      const res = await get<{ success: boolean; data: HotSpot[]; total: number }>(`/hotspots?${params}`)
      let data: HotSpot[] = res.data
      if (status === 'unread') data = data.filter(h => !h.isRead)
      if (status === 'saved')  data = data.filter(h => h.isSaved)
      setHotspots(data)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  const loadDomains = async () => {
    const res = await get<{ success: boolean; data: string[] }>('/hotspots/domains')
    setDomains(res.data)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await post('/hotspots/refresh')
    setTimeout(() => { load(); setRefreshing(false) }, 3000)
  }

  const handleReadAll = async () => {
    await post('/hotspots/read-all')
    load()
  }

  const handlePageChange = (p: number) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => { loadDomains() }, [])

  // 所有筛选/排序/翻页统一用一个 effect 驱动，React 18 自动批量更新
  useEffect(() => {
    load(page)
  }, [domain, sort, status, source, heatLevel, timeRange, language, page])

  return (
    <div className="animate-fade-in">
      <TopBar
        title="热点发现"
        subtitle={`共 ${total} 条热点 · 第 ${page}/${totalPages} 页`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setExpandAllAi(v => !v)}>
              {expandAllAi
                ? <><ChevronsDownUp size={14} /> 折叠全部</>
                : <><ChevronsUpDown size={14} /> 展开全部</>
              }
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReadAll}>
              <CheckCheck size={14} /> 全部已读
            </Button>
            <Button variant="secondary" size="sm" loading={refreshing} onClick={handleRefresh}>
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> 刷新
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-4">
        {/* ── 第一行：主要筛选 ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={domain}
            onChange={e => { setDomain(e.target.value); resetPage() }}
            className="px-3 py-1.5 rounded-lg text-[10px] text-slate-300 border outline-none focus:border-cyan-500/40 transition-all font-mono"
            style={{ background: 'rgba(8,12,22,0.95)', borderColor: 'rgba(255,255,255,0.09)' }}
          >
            <option value="">ALL DOMAINS</option>
            {domains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <PillGroup options={SORT_OPTIONS} value={sort} onChange={v => { setSort(v); resetPage() }} />

          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            {(['all', 'unread', 'saved'] as const).map(f => (
              <button
                key={f}
                onClick={() => { setStatus(f); resetPage() }}
                className="px-2.5 py-1.5 text-[10px] font-mono transition-all flex items-center gap-1"
                style={{
                  background: status === f ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.02)',
                  color: status === f ? '#22d3ee' : '#475569',
                  borderRight: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                {f === 'saved' && <Bookmark size={9} />}
                {f === 'all' ? 'ALL' : f === 'unread' ? 'UNREAD' : 'SAVED'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all"
            style={{
              background: showFilters || activeFilterCount > 0 ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
              border: '1px solid',
              borderColor: showFilters || activeFilterCount > 0 ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.08)',
              color: showFilters || activeFilterCount > 0 ? '#a78bfa' : '#475569',
            }}
          >
            <SlidersHorizontal size={11} />
            更多筛选
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold"
                style={{ background: 'rgba(124,58,237,0.5)', color: '#c4b5fd' }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={() => { clearExtraFilters(); resetPage() }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all text-slate-500 hover:text-red-400"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <X size={9} /> 清除
            </button>
          )}
        </div>

        {/* ── 第二行：扩展筛选 ── */}
        {showFilters && (
          <div
            className="flex items-center gap-2 flex-wrap p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="text-[10px] text-slate-600 font-mono mr-1">来源平台</span>
            <PillGroup options={SOURCE_OPTIONS} value={source} onChange={v => { setSource(v); resetPage() }} />

            <div className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <span className="text-[10px] text-slate-600 font-mono mr-1">热度段位</span>
            <PillGroup options={HEAT_OPTIONS} value={heatLevel} onChange={v => { setHeatLevel(v); resetPage() }} />

            <div className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <span className="text-[10px] text-slate-600 font-mono mr-1">时间范围</span>
            <PillGroup options={TIME_OPTIONS} value={timeRange} onChange={v => { setTimeRange(v); resetPage() }} />

            <div className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <span className="text-[10px] text-slate-600 font-mono mr-1">内容语言</span>
            <PillGroup options={LANG_OPTIONS} value={language} onChange={v => { setLanguage(v); resetPage() }} />
          </div>
        )}

        {/* ── 内容区域 ── */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array(PAGE_SIZE).fill(0).map((_, i) => (
              <div key={i} className="shimmer rounded-xl h-36" />
            ))}
          </div>
        ) : hotspots.length === 0 ? (
          <div className="rounded-xl border p-14 text-center"
            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <TrendingUp size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-medium mb-1">
              {activeFilterCount > 0 ? '当前筛选条件下暂无数据' : '暂无热点数据'}
            </p>
            <p className="text-slate-700 text-xs mb-6 font-mono">
              {activeFilterCount > 0 ? '尝试调整筛选条件或清除筛选' : '点击刷新或等待系统自动发现'}
            </p>
            {activeFilterCount > 0 ? (
              <Button variant="secondary" onClick={() => { clearExtraFilters(); resetPage() }}>
                <X size={13} /> 清除筛选
              </Button>
            ) : (
              <Button variant="primary" loading={refreshing} onClick={handleRefresh}>
                <RefreshCw size={13} /> 立即发现热点
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {hotspots.map((h, i) => (
                <HotspotCard key={h.id} hotspot={h} onRefresh={() => load(page)} index={i} expandAiReason={expandAllAi} />
              ))}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </div>
  )
}

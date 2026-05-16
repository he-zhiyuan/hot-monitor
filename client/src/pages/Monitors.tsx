import { useEffect, useState, useMemo } from 'react'
import { Plus, Radar, Search, ChevronsDownUp, ChevronsUpDown, Calendar, Clock, User, Heart, MessageSquare, Share2, Eye, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import TopBar from '../components/layout/TopBar'
import MonitorCard from '../components/monitors/MonitorCard'
import AddMonitorModal from '../components/monitors/AddMonitorModal'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import api from '../lib/api'
import type { Monitor, Finding } from '../types'

// 来源平台选项（Findings 弹窗用）
const FINDING_SOURCES = [
  'all', 'twitter', 'hackernews', 'github', 'reddit', 'devto',
  'googlenews', 'bilibili', 'baidu', '36kr', 'sspai', 'web',
]
const SOURCE_LABEL: Record<string, string> = {
  all: 'ALL', twitter: 'X', hackernews: 'HN', github: 'GitHub',
  reddit: 'Reddit', devto: 'Dev.to', googlenews: 'GNews',
  bilibili: 'B站', baidu: '百度', '36kr': '36氪', sspai: '少数派', web: 'Web',
}

// AI 评分阈值
const AI_THRESHOLDS = [
  { value: 'all',  label: 'ALL' },
  { value: '0.7',  label: '≥7.0 高质量' },
  { value: '0.5',  label: '≥5.0 相关' },
]

// 排序方式
const FINDING_SORTS = [
  { value: 'time',    label: '时间' },
  { value: 'aiScore', label: 'AI评分' },
]

export default function Monitors() {
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Monitor | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [findingsLoading, setFindingsLoading] = useState(false)

  // Findings 弹窗内部筛选/排序状态
  const [findingSort,      setFindingSort]      = useState('time')
  const [findingSource,    setFindingSource]    = useState('all')
  const [findingThreshold, setFindingThreshold] = useState('all')
  const [expandAllAi,      setExpandAllAi]      = useState(false)
  const [expandedAiSet,    setExpandedAiSet]    = useState<Set<string>>(new Set())
  const [expandedContentSet, setExpandedContentSet] = useState<Set<string>>(new Set())

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/monitors')
      setMonitors(res.data)
    } finally {
      setLoading(false)
    }
  }

  const openFindings = async (monitor: Monitor) => {
    setSelected(monitor)
    setFindingSort('time')
    setFindingSource('all')
    setFindingThreshold('all')
    setExpandAllAi(false)
    setExpandedAiSet(new Set())
    setExpandedContentSet(new Set())
    setFindingsLoading(true)
    const res = await api.get(`/monitors/${monitor.id}/findings`)
    setFindings(res.data)
    setFindingsLoading(false)
  }

  const toggleAiExpand = (id: string) => {
    setExpandedAiSet(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleContentExpand = (id: string) => {
    setExpandedContentSet(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleToggleAllAi = () => {
    if (expandAllAi) {
      setExpandAllAi(false)
      setExpandedAiSet(new Set())
    } else {
      setExpandAllAi(true)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = monitors.filter(m =>
    m.keyword.toLowerCase().includes(search.toLowerCase()) ||
    m.description?.toLowerCase().includes(search.toLowerCase())
  )

  // Findings 弹窗内部处理：筛选 + 排序
  const filteredFindings = useMemo(() => {
    let list = [...findings]
    if (findingSource !== 'all') list = list.filter(f => f.source === findingSource)
    if (findingThreshold !== 'all') list = list.filter(f => f.aiScore >= parseFloat(findingThreshold))
    if (findingSort === 'aiScore') list.sort((a, b) => b.aiScore - a.aiScore)
    return list
  }, [findings, findingSource, findingThreshold, findingSort])

  // 当前 findings 中存在的来源列表（仅显示有数据的）
  const presentSources = useMemo(() => {
    const s = new Set(findings.map(f => f.source))
    return FINDING_SOURCES.filter(src => src === 'all' || s.has(src))
  }, [findings])

  return (
    <div className="animate-fade-in">
      <TopBar
        title="关键词监控"
        subtitle={`共 ${monitors.length} 个，${monitors.filter(m => m.isActive).length} 个活跃`}
        actions={
          <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> 添加监控
          </Button>
        }
      />

      <div className="p-7 space-y-5">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索关键词..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-slate-300 placeholder-slate-700 border outline-none focus:border-cyan-500/40 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.08)] transition-all"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="shimmer rounded-xl h-40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-14 text-center">
            <Radar size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-medium mb-1">暂无监控项</p>
            <p className="text-slate-700 text-xs mb-6 font-mono">添加关键词开始监控 AI 热点</p>
            <Button variant="primary" onClick={() => setAddOpen(true)}>
              <Plus size={14} /> 添加第一个监控
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((m, i) => (
              <MonitorCard key={m.id} monitor={m} onRefresh={load} onClick={() => openFindings(m)} index={i} />
            ))}
          </div>
        )}
      </div>

      <AddMonitorModal open={addOpen} onClose={() => setAddOpen(false)} onSuccess={load} />

      {/* Findings Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`"${selected?.keyword}" 发现记录`} width="max-w-2xl">
        {findingsLoading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => <div key={i} className="shimmer rounded-xl h-20" />)}
          </div>
        ) : findings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">暂无发现记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* ── 筛选工具栏 ── */}
            <div className="flex items-center gap-2 flex-wrap pb-1">
              {/* 排序 */}
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                {FINDING_SORTS.map(o => (
                  <button key={o.value} onClick={() => setFindingSort(o.value)}
                    className="px-2.5 py-1.5 text-[10px] font-mono transition-all"
                    style={{
                      background: findingSort === o.value ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.02)',
                      color: findingSort === o.value ? '#22d3ee' : '#475569',
                      borderRight: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >{o.label}</button>
                ))}
              </div>

              {/* 来源平台（只显示数据中存在的） */}
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                {presentSources.map(src => (
                  <button key={src} onClick={() => setFindingSource(src)}
                    className="px-2.5 py-1.5 text-[10px] font-mono transition-all"
                    style={{
                      background: findingSource === src ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.02)',
                      color: findingSource === src ? '#22d3ee' : '#475569',
                      borderRight: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >{SOURCE_LABEL[src] ?? src}</button>
                ))}
              </div>

              {/* AI 评分阈值 */}
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                {AI_THRESHOLDS.map(o => (
                  <button key={o.value} onClick={() => setFindingThreshold(o.value)}
                    className="px-2.5 py-1.5 text-[10px] font-mono transition-all"
                    style={{
                      background: findingThreshold === o.value ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.02)',
                      color: findingThreshold === o.value ? '#a78bfa' : '#475569',
                      borderRight: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >{o.label}</button>
                ))}
              </div>

              {/* 一键展开/折叠所有 AI 理由 */}
              <button
                onClick={handleToggleAllAi}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all"
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: expandAllAi ? 'rgba(34,211,238,0.08)' : 'rgba(255,255,255,0.02)',
                  color: expandAllAi ? '#22d3ee' : '#475569',
                }}
              >
                {expandAllAi ? <><ChevronsDownUp size={10} /> 折叠分析</> : <><ChevronsUpDown size={10} /> 展开摘要与判定</>}
              </button>

              {/* 结果计数 */}
              <span className="text-[10px] text-slate-600 font-mono ml-auto">
                {filteredFindings.length} / {findings.length} 条
              </span>
            </div>

            {/* ── 记录列表 ── */}
            {filteredFindings.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-slate-600 text-xs font-mono">当前筛选条件下无记录</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {filteredFindings.map(f => {
                  const isAiExpanded = expandAllAi || expandedAiSet.has(f.id)
                  const isContentExpanded = expandedContentSet.has(f.id)
                  const publishTime = f.publishedAt ? new Date(f.publishedAt) : null
                  const captureTime = new Date(f.createdAt)
                  const hasEngagement = (f.likes ?? f.comments ?? f.shares ?? f.views) != null

                  const fmtTime = (d: Date) => d.toLocaleString('zh-CN', {
                    month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', hour12: false,
                  })
                  const relTime = (d: Date) => {
                    const diff = Date.now() - d.getTime()
                    const h = Math.floor(diff / 3600000)
                    const day = Math.floor(diff / 86400000)
                    if (h < 1) return `${Math.floor(diff / 60000)}分钟前`
                    if (h < 24) return `${h}小时前`
                    if (day < 7) return `${day}天前`
                    return fmtTime(d)
                  }
                  const formatN = (n: number) => n >= 10000 ? `${(n/10000).toFixed(1)}w` : n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n)

                  return (
                    <div key={f.id}
                      className="rounded-xl p-4 border"
                      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
                    >
                      {/* 顶部：状态 + 来源 + 作者 + AI分数 */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant={f.isNotified ? 'green' : 'gray'}>{f.isNotified ? '已推送' : '未触发'}</Badge>
                        <Badge variant="gray">{f.source}</Badge>
                        {f.author && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                            <User size={9} />
                            <span className="max-w-[80px] truncate">{f.author}</span>
                          </span>
                        )}
                        <span
                          className="text-[10px] ml-auto font-mono font-semibold"
                          style={{ color: f.aiScore >= 0.7 ? '#22d3ee' : f.aiScore >= 0.5 ? '#fbbf24' : '#475569' }}
                        >
                          相关性 {(f.aiScore * 10).toFixed(1)}
                        </span>
                      </div>

                      {/* 标题链接 */}
                      <a href={f.url} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-slate-300 hover:text-cyan-400 transition-colors line-clamp-2 font-medium block mb-2"
                      >
                        {f.title}
                      </a>

                      {/* 双时间行 */}
                      <div className="flex items-center gap-3 mb-2">
                        {publishTime && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500 font-mono" title={fmtTime(publishTime)}>
                            <Calendar size={9} className="text-slate-600" />
                            发布 {relTime(publishTime)}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[10px] text-slate-600 font-mono" title={fmtTime(captureTime)}>
                          <Clock size={9} />
                          抓取 {relTime(captureTime)}
                        </span>
                      </div>

                      {/* 互动数据 */}
                      {hasEngagement && (
                        <div className="flex items-center gap-3 mb-2 py-1.5 px-2 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.03)' }}
                        >
                          {f.likes != null && (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                              <Heart size={9} className="text-rose-500/60" />{formatN(f.likes)}
                            </span>
                          )}
                          {f.comments != null && (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                              <MessageSquare size={9} className="text-sky-500/60" />{formatN(f.comments)}
                            </span>
                          )}
                          {f.shares != null && (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                              <Share2 size={9} className="text-violet-500/60" />{formatN(f.shares)}
                            </span>
                          )}
                          {f.views != null && (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                              <Eye size={9} className="text-emerald-500/60" />{formatN(f.views)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* AI 分析理由：默认隐藏，单条/全局展开后显示 */}
                      {(f.aiSummary || f.aiReason) && (
                        <div className="mb-2">
                          {isAiExpanded && (
                            <div className="space-y-2">
                              {f.aiSummary && (
                              <div
                                className="text-xs text-slate-300 leading-relaxed rounded-lg px-2.5 py-2"
                                style={{ background: 'rgba(34,211,238,0.06)', borderLeft: '2px solid rgba(34,211,238,0.25)' }}
                              >
                                <span className="text-[10px] font-mono text-cyan-600/90 block mb-1">摘要</span>
                                {f.aiSummary}
                              </div>
                              )}
                              {f.aiReason && (
                                <div
                                  className="text-xs text-slate-500 leading-relaxed rounded-lg px-2.5 py-2"
                                  style={{ background: 'rgba(124,58,237,0.06)', borderLeft: '2px solid rgba(124,58,237,0.25)' }}
                                >
                                  <span className="text-[10px] font-mono text-violet-400/80 block mb-1">判定</span>
                                  <span className="whitespace-pre-wrap">{f.aiReason}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {/* 全局展开时隐藏单条按钮，全局关闭时显示 */}
                          {!expandAllAi && (
                            <button
                              onClick={() => toggleAiExpand(f.id)}
                              className="flex items-center gap-1 text-[10px] font-mono transition-colors"
                              style={{ color: expandedAiSet.has(f.id) ? '#22d3ee' : '#475569' }}
                            >
                              {expandedAiSet.has(f.id)
                                ? <><ChevronUp size={9} /> 收起分析</>
                                : <><ChevronDown size={9} /> 查看 AI 摘要与判定</>
                              }
                            </button>
                          )}
                        </div>
                      )}

                      {/* 原始内容预览（可展开/折叠） */}
                      {f.content && f.content !== f.title && (
                        <div>
                          <button
                            onClick={() => toggleContentExpand(f.id)}
                            className="flex items-center gap-1 text-[10px] font-mono transition-colors mb-1"
                            style={{ color: isContentExpanded ? '#22d3ee' : '#475569' }}
                          >
                            <FileText size={9} />
                            {isContentExpanded ? '收起原文' : '查看原始内容'}
                            {isContentExpanded ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                          </button>
                          {isContentExpanded && (
                            <div className="text-[11px] text-slate-600 leading-relaxed rounded-lg px-2.5 py-2 font-mono whitespace-pre-wrap"
                              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
                            >
                              {f.content.slice(0, 800)}{f.content.length > 800 ? '…' : ''}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

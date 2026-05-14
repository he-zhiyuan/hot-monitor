import { useEffect, useState, useMemo } from 'react'
import { Plus, Radar, Search } from 'lucide-react'
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
    setFindingsLoading(true)
    const res = await api.get(`/monitors/${monitor.id}/findings`)
    setFindings(res.data)
    setFindingsLoading(false)
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
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredFindings.map(f => (
                  <div key={f.id}
                    className="rounded-xl p-4 border"
                    style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={f.isNotified ? 'green' : 'gray'}>{f.isNotified ? '已推送' : '未触发'}</Badge>
                      <Badge variant="gray">{f.source}</Badge>
                      <span
                        className="text-[10px] ml-auto font-mono font-semibold"
                        style={{ color: f.aiScore >= 0.7 ? '#22d3ee' : f.aiScore >= 0.5 ? '#fbbf24' : '#475569' /* 原始值 0-1，显示时 ×10 */ }}
                      >
                        AI {(f.aiScore * 10).toFixed(1)}
                      </span>
                    </div>
                    <a href={f.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-slate-300 hover:text-cyan-400 transition-colors line-clamp-2 font-medium"
                    >
                      {f.title}
                    </a>
                    {f.aiSummary && (
                      <p className="text-xs text-slate-500 mt-1.5">{f.aiSummary}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

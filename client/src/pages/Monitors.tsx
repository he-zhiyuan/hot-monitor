import { useEffect, useState } from 'react'
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

export default function Monitors() {
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Monitor | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [findingsLoading, setFindingsLoading] = useState(false)

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
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {findings.map(f => (
              <div key={f.id}
                className="rounded-xl p-4 border"
                style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={f.isNotified ? 'green' : 'gray'}>{f.isNotified ? '已推送' : '未触发'}</Badge>
                  <Badge variant="gray">{f.source}</Badge>
                  <span className="text-[10px] text-slate-600 ml-auto font-mono">
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
      </Modal>
    </div>
  )
}

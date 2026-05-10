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
        subtitle={`共 ${monitors.length} 个监控项，${monitors.filter(m => m.isActive).length} 个活跃`}
        actions={
          <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> 添加监控
          </Button>
        }
      />

      <div className="p-8 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索关键词..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-slate-300 placeholder-slate-600 border outline-none focus:border-purple-500/50 transition-colors"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-16 text-center">
            <Radar size={40} className="text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">暂无监控项</p>
            <p className="text-slate-600 text-sm mt-1 mb-6">添加关键词开始监控 AI 热点</p>
            <Button variant="primary" onClick={() => setAddOpen(true)}>
              <Plus size={14} /> 添加第一个监控
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map(m => (
              <MonitorCard key={m.id} monitor={m} onRefresh={load} onClick={() => openFindings(m)} />
            ))}
          </div>
        )}
      </div>

      <AddMonitorModal open={addOpen} onClose={() => setAddOpen(false)} onSuccess={load} />

      {/* Findings Drawer */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`"${selected?.keyword}" 发现记录`} width="max-w-2xl">
        {findingsLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : findings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">暂无发现记录</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {findings.map(f => (
              <div key={f.id}
                className="rounded-xl p-4 border"
                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={f.isNotified ? 'green' : 'gray'}>{f.isNotified ? '已推送' : '未触发'}</Badge>
                  <Badge variant="gray">{f.source}</Badge>
                  <span className="text-xs text-slate-600 ml-auto">
                    AI 评分 {(f.aiScore * 10).toFixed(1)}
                  </span>
                </div>
                <a href={f.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-slate-300 hover:text-purple-400 transition-colors line-clamp-2 font-medium"
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

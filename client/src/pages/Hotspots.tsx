import { useEffect, useState } from 'react'
import { TrendingUp, RefreshCw, CheckCheck, Bookmark } from 'lucide-react'
import TopBar from '../components/layout/TopBar'
import HotspotCard from '../components/hotspots/HotspotCard'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { get, post } from '../lib/api'
import type { HotSpot } from '../types'

const SORT_OPTIONS = [
  { value: 'heat', label: '热度排序' },
  { value: 'time', label: '时间排序' },
]

export default function Hotspots() {
  const [hotspots, setHotspots] = useState<HotSpot[]>([])
  const [domains, setDomains] = useState<string[]>([])
  const [domain, setDomain] = useState('')
  const [sort, setSort] = useState('heat')
  const [filter, setFilter] = useState<'all' | 'unread' | 'saved'>('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [total, setTotal] = useState(0)

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ sort, limit: '50' })
      if (domain) params.set('domain', domain)
      const res = await get<{ success: boolean; data: HotSpot[]; total: number }>(`/hotspots?${params}`)
      let data: HotSpot[] = res.data
      if (filter === 'unread') data = data.filter(h => !h.isRead)
      if (filter === 'saved') data = data.filter(h => h.isSaved)
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

  useEffect(() => { loadDomains() }, [])
  useEffect(() => { load() }, [domain, sort, filter])

  return (
    <div className="animate-fade-in">
      <TopBar
        title="热点发现"
        subtitle={`${total} 条热点，自动聚合多源数据`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleReadAll}>
              <CheckCheck size={14} /> 全部已读
            </Button>
            <Button variant="secondary" size="sm" loading={refreshing} onClick={handleRefresh}>
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> 刷新
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-5">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Domain filter */}
          <select
            value={domain}
            onChange={e => setDomain(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm text-slate-300 border outline-none"
            style={{ background: 'rgba(13,18,32,0.98)', borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <option value="">全部领域</option>
            {domains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          {/* Sort */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {SORT_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => setSort(o.value)}
                className="px-3 py-2 text-xs transition-colors"
                style={{
                  background: sort === o.value ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.02)',
                  color: sort === o.value ? '#a78bfa' : '#64748b',
                }}
              >
                {o.label}
              </button>
            ))}
          </div>

          {/* Read filter */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {(['all', 'unread', 'saved'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-2 text-xs transition-colors flex items-center gap-1"
                style={{
                  background: filter === f ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.02)',
                  color: filter === f ? '#a78bfa' : '#64748b',
                }}
              >
                {f === 'saved' && <Bookmark size={11} />}
                {f === 'all' ? '全部' : f === 'unread' ? '未读' : '收藏'}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : hotspots.length === 0 ? (
          <Card className="p-16 text-center">
            <TrendingUp size={40} className="text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">暂无热点数据</p>
            <p className="text-slate-600 text-sm mt-1 mb-6">点击刷新或等待系统自动发现</p>
            <Button variant="primary" loading={refreshing} onClick={handleRefresh}>
              <RefreshCw size={14} /> 立即发现热点
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {hotspots.map(h => (
              <HotspotCard key={h.id} hotspot={h} onRefresh={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

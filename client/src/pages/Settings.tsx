import { useEffect, useState } from 'react'
import { Save, Plus, X } from 'lucide-react'
import TopBar from '../components/layout/TopBar'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import api from '../lib/api'

interface SettingsData {
  discovery_domains: string
  notify_email: string
  notify_push: string
  monitor_interval: string
  hotspot_interval: string
}

export default function Settings() {
  const [settings, setSettings] = useState<SettingsData>({
    discovery_domains: '["AI 编程", "大模型", "AI Agent", "Claude", "GPT"]',
    notify_email: 'true',
    notify_push: 'true',
    monitor_interval: '15',
    hotspot_interval: '60',
  })
  const [domains, setDomains] = useState<string[]>([])
  const [newDomain, setNewDomain] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = async () => {
    try {
      const res = await api.get('/settings')
      setSettings(res.data)
      try { setDomains(JSON.parse(res.data.discovery_domains)) } catch { setDomains([]) }
    } finally { setLoading(false) }
  }

  const save = async () => {
    setSaving(true)
    await api.put('/settings', {
      ...settings,
      discovery_domains: JSON.stringify(domains),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  const addDomain = () => {
    if (newDomain.trim() && !domains.includes(newDomain.trim())) {
      setDomains([...domains, newDomain.trim()])
      setNewDomain('')
    }
  }

  const removeDomain = (d: string) => setDomains(domains.filter(x => x !== d))

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-slate-300 mb-5 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-purple-500" />
        {title}
      </h2>
      {children}
    </Card>
  )

  const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-6 py-3 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="flex-1">
        <div className="text-sm text-slate-300">{label}</div>
        {hint && <div className="text-xs text-slate-600 mt-0.5">{hint}</div>}
      </div>
      {children}
    </div>
  )

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      className="relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0"
      style={{
        background: value ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'rgba(255,255,255,0.1)',
        height: '22px',
      }}
    >
      <span
        className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform"
        style={{
          width: '18px', height: '18px',
          transform: value ? 'translateX(22px)' : 'translateX(2px)',
        }}
      />
    </button>
  )

  return (
    <div className="animate-fade-in">
      <TopBar
        title="系统设置"
        subtitle="配置监控参数和通知方式"
        actions={
          <Button variant="primary" size="sm" loading={saving} onClick={save}>
            <Save size={14} /> {saved ? '已保存 ✓' : '保存设置'}
          </Button>
        }
      />

      <div className="p-8 space-y-5 max-w-2xl">
        {/* 热点发现领域 */}
        <Section title="热点发现领域">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 min-h-8">
              {domains.map(d => (
                <span key={d} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-purple-300 border"
                  style={{ background: 'rgba(124,58,237,0.1)', borderColor: 'rgba(124,58,237,0.2)' }}
                >
                  {d}
                  <button onClick={() => removeDomain(d)} className="text-purple-500 hover:text-red-400 transition-colors ml-0.5">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newDomain}
                onChange={e => setNewDomain(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addDomain()}
                placeholder="添加领域，如：AI 编程"
                className="flex-1 px-3 py-2 rounded-lg text-sm text-slate-300 placeholder-slate-600 border outline-none focus:border-purple-500/50 transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
              />
              <Button variant="secondary" size="sm" onClick={addDomain}>
                <Plus size={14} /> 添加
              </Button>
            </div>
          </div>
        </Section>

        {/* 通知设置 */}
        <Section title="通知方式">
          <Field label="邮件通知" hint="发现新热点时发送邮件（需配置 SMTP）">
            <Toggle
              value={settings.notify_email === 'true'}
              onChange={v => setSettings(s => ({ ...s, notify_email: String(v) }))}
            />
          </Field>
          <Field label="浏览器推送" hint="需要浏览器授权（功能开发中）">
            <Toggle
              value={settings.notify_push === 'true'}
              onChange={v => setSettings(s => ({ ...s, notify_push: String(v) }))}
            />
          </Field>
        </Section>

        {/* 调度配置 */}
        <Section title="调度配置">
          <Field label="关键词监控频率" hint="每隔多少分钟扫描一次">
            <select
              value={settings.monitor_interval}
              onChange={e => setSettings(s => ({ ...s, monitor_interval: e.target.value }))}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-300 border outline-none"
              style={{ background: 'rgba(13,18,32,0.98)', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <option value="5">5 分钟</option>
              <option value="15">15 分钟</option>
              <option value="30">30 分钟</option>
              <option value="60">60 分钟</option>
            </select>
          </Field>
          <Field label="热点发现频率" hint="每隔多少分钟自动发现热点">
            <select
              value={settings.hotspot_interval}
              onChange={e => setSettings(s => ({ ...s, hotspot_interval: e.target.value }))}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-300 border outline-none"
              style={{ background: 'rgba(13,18,32,0.98)', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <option value="30">30 分钟</option>
              <option value="60">1 小时</option>
              <option value="120">2 小时</option>
            </select>
          </Field>
        </Section>

        {/* 环境变量提示 */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-amber-500" />
            API 密钥配置
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            以下配置需在 <code className="text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded">server/.env</code> 文件中设置（出于安全考虑不在此页面展示）：
          </p>
          <div className="space-y-1.5 font-mono text-xs">
            {['OPENROUTER_API_KEY', 'TWITTERAPI_IO_KEY', 'SMTP_HOST / SMTP_USER / SMTP_PASS'].map(key => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-cyan-400">{key}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

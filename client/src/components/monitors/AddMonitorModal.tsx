import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import api from '../../lib/api'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddMonitorModal({ open, onClose, onSuccess }: Props) {
  const [keyword, setKeyword] = useState('')
  const [description, setDescription] = useState('')
  const [interval, setInterval] = useState(15)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyword.trim()) { setError('请输入关键词'); return }
    setLoading(true)
    setError('')
    try {
      await api.post('/monitors', { keyword, description, intervalMin: interval })
      setKeyword('')
      setDescription('')
      setInterval(15)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="添加关键词监控">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            关键词 <span className="text-red-400">*</span>
          </label>
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="如：Claude 5、GPT-5、Cursor AI"
            className="w-full px-3 py-2.5 rounded-lg text-sm text-slate-200 placeholder-slate-700 border outline-none focus:border-cyan-500/40 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.08)] transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.09)' }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">备注说明</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="可选，方便自己识别"
            className="w-full px-3 py-2.5 rounded-lg text-sm text-slate-200 placeholder-slate-700 border outline-none focus:border-cyan-500/40 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.08)] transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.09)' }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">检测频率（分钟）</label>
          <select
            value={interval}
            onChange={e => setInterval(Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-lg text-sm text-slate-200 border outline-none focus:border-cyan-500/40 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.08)] transition-all"
            style={{ background: 'rgba(8,12,22,0.98)', borderColor: 'rgba(255,255,255,0.09)' }}
          >
            <option value={5}>每 5 分钟</option>
            <option value={15}>每 15 分钟</option>
            <option value={30}>每 30 分钟</option>
            <option value={60}>每 1 小时</option>
          </select>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>取消</Button>
          <Button variant="primary" type="submit" loading={loading}>添加监控</Button>
        </div>
      </form>
    </Modal>
  )
}

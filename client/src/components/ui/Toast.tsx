import { useEffect } from 'react'
import { X, ExternalLink, Zap } from 'lucide-react'

export interface ToastItem {
  id: string
  title: string
  body: string
  url?: string
}

interface ToastProps {
  toast: ToastItem
  onClose: (id: string) => void
}

function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), 6000)
    return () => clearTimeout(timer)
  }, [toast.id, onClose])

  return (
    <div
      className="flex items-start gap-3 p-4 rounded-xl border shadow-2xl animate-slide-up cursor-pointer w-80"
      style={{
        background: 'rgba(13,18,32,0.98)',
        borderColor: 'rgba(124,58,237,0.4)',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 0 30px rgba(124,58,237,0.25), 0 8px 32px rgba(0,0,0,0.5)',
      }}
      onClick={() => toast.url && window.open(toast.url, '_blank')}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
      >
        <Zap size={15} className="text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 leading-snug">{toast.title}</p>
        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{toast.body}</p>
        {toast.url && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-purple-400">
            <ExternalLink size={10} /> 点击查看原文
          </div>
        )}
      </div>

      {/* Close */}
      <button
        onClick={e => { e.stopPropagation(); onClose(toast.id) }}
        className="p-1 rounded-md text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0 -mt-0.5"
      >
        <X size={14} />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #7c3aed, #06b6d4)',
            animation: 'shrink 6s linear forwards',
          }}
        />
      </div>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastItem[]
  onClose: (id: string) => void
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onClose={onClose} />
      ))}
    </div>
  )
}

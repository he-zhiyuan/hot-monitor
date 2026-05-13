import { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import Dashboard from './pages/Dashboard'
import Monitors from './pages/Monitors'
import Hotspots from './pages/Hotspots'
import Notifications from './pages/Notifications'
import Settings from './pages/Settings'
import { ToastContainer, type ToastItem } from './components/ui/Toast'
import { useSocket } from './hooks/useSocket'

function AppContent() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const handleNotification = useCallback((payload: ToastItem) => {
    setToasts(prev => [...prev, { ...payload, id: payload.id + Date.now() }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useSocket(handleNotification)

  return (
    <div className="flex min-h-screen" style={{ background: '#030712' }}>
      <Sidebar />
      <main className="flex-1 ml-[220px] min-h-screen overflow-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/monitors" element={<Monitors />} />
          <Route path="/hotspots" element={<Hotspots />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

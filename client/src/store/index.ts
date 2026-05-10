import { create } from 'zustand'

interface AppState {
  unreadCount: number
  setUnreadCount: (count: number) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>(set => ({
  unreadCount: 0,
  setUnreadCount: count => set({ unreadCount: count }),
  sidebarOpen: true,
  setSidebarOpen: open => set({ sidebarOpen: open }),
}))

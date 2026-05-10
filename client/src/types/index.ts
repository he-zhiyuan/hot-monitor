export interface Monitor {
  id: string
  keyword: string
  description?: string
  isActive: boolean
  intervalMin: number
  lastChecked?: string
  createdAt: string
  updatedAt: string
  _count?: { findings: number }
  findings?: Finding[]
}

export interface Finding {
  id: string
  monitorId: string
  title: string
  content: string
  url: string
  source: string
  author?: string
  publishedAt?: string
  aiScore: number
  aiSummary: string
  isNotified: boolean
  createdAt: string
}

export interface HotSpot {
  id: string
  title: string
  summary: string
  url: string
  source: string
  author?: string
  domain: string
  heatScore: number
  sourceCount: number
  isRead: boolean
  isSaved: boolean
  publishedAt?: string
  createdAt: string
}

export interface Notification {
  id: string
  title: string
  body: string
  type: string
  refId?: string
  url?: string
  isRead: boolean
  createdAt: string
}

export interface Settings {
  discovery_domains: string
  notify_email: string
  notify_push: string
  monitor_interval: string
  hotspot_interval: string
}

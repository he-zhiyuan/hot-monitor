import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  res => res.data,
  err => {
    const msg = err.response?.data?.error || err.message || '请求失败'
    return Promise.reject(new Error(msg))
  }
)

// Helper to unwrap typed responses
export async function get<T = any>(url: string, params?: Record<string, unknown>): Promise<T> {
  return api.get(url, { params }) as unknown as T
}

export async function post<T = any>(url: string, data?: unknown): Promise<T> {
  return api.post(url, data) as unknown as T
}

export async function patch<T = any>(url: string, data?: unknown): Promise<T> {
  return api.patch(url, data) as unknown as T
}

export async function del<T = any>(url: string): Promise<T> {
  return api.delete(url) as unknown as T
}

export default api

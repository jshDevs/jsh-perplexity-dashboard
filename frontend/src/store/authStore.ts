/**
 * authStore.ts — estado de autenticación JWT en React.
 * Persiste accessToken y refreshToken en localStorage.
 * Interceptor axios renueva el access token si expira (401).
 */
import { create }   from 'zustand'
import { persist }  from 'zustand/middleware'
import axios        from 'axios'

const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api/v1/auth'

export type UserRole = 'viewer' | 'editor' | 'admin'

export interface AuthUser {
  id:    string
  email: string
  role:  UserRole
}

interface AuthState {
  user:         AuthUser | null
  accessToken:  string | null
  refreshToken: string | null
  isAuth:       boolean

  login:   (email: string, password: string) => Promise<void>
  logout:  () => Promise<void>
  refresh: () => Promise<boolean>
  setTokens: (access: string, refresh: string, user: AuthUser) => void
  clear:   () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,
      isAuth:       false,

      login: async (email, password) => {
        const { data } = await axios.post(`${BASE}/login`, { email, password })
        set({
          accessToken:  data.accessToken,
          refreshToken: data.refreshToken,
          user:         data.user,
          isAuth:       true,
        })
      },

      logout: async () => {
        try {
          const token = get().accessToken
          if (token) await axios.post(`${BASE}/logout`, {}, { headers: { Authorization: `Bearer ${token}` } })
        } catch { /* ignorar */ }
        get().clear()
      },

      refresh: async () => {
        const rt = get().refreshToken
        if (!rt) { get().clear(); return false }
        try {
          const { data } = await axios.post(`${BASE}/refresh`, { refreshToken: rt })
          set({ accessToken: data.accessToken, refreshToken: data.refreshToken })
          return true
        } catch {
          get().clear()
          return false
        }
      },

      setTokens: (access, refresh, user) =>
        set({ accessToken: access, refreshToken: refresh, user, isAuth: true }),

      clear: () => set({ user: null, accessToken: null, refreshToken: null, isAuth: false }),
    }),
    { name: 'jsh-auth-v1', version: 1 }
  )
)

// ── Axios interceptor global — renueva token 401 automáticamente ──
let isRefreshing = false
let queue: Array<(token: string) => void> = []

axios.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`
  return config
})

axios.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry) return Promise.reject(error)
    original._retry = true

    if (isRefreshing) {
      return new Promise((resolve) => {
        queue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`
          resolve(axios(original))
        })
      })
    }

    isRefreshing = true
    const ok = await useAuthStore.getState().refresh()
    isRefreshing = false

    if (ok) {
      const newToken = useAuthStore.getState().accessToken!
      queue.forEach((cb) => cb(newToken))
      queue = []
      original.headers.Authorization = `Bearer ${newToken}`
      return axios(original)
    }

    queue = []
    return Promise.reject(error)
  }
)

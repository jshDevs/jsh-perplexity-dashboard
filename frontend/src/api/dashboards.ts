/**
 * dashboards.ts — cliente HTTP para persistencia de dashboards en Redis.
 * El backend guarda DashboardConfig[] con TTL largo (7 días).
 */
import axios from 'axios'
import type { DashboardConfig } from '@/store/dashboardStore'

const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api/v1'

export async function saveDashboard(config: DashboardConfig): Promise<void> {
  await axios.put(`${BASE}/dashboards/${config.id}`, config)
}

export async function loadDashboard(id: string): Promise<DashboardConfig | null> {
  try {
    const { data } = await axios.get<DashboardConfig>(`${BASE}/dashboards/${id}`)
    return data
  } catch (e: any) {
    if (e?.response?.status === 404) return null
    throw e
  }
}

export async function listDashboards(): Promise<string[]> {
  const { data } = await axios.get<{ ids: string[] }>(`${BASE}/dashboards`)
  return data.ids
}

export async function deleteDashboardRemote(id: string): Promise<void> {
  await axios.delete(`${BASE}/dashboards/${id}`)
}

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '@/api/client'
import { dashboardsApi, ingestApi } from '@/api/dashboards'
import axios from 'axios'

vi.mock('axios')
const mockedAxios = vi.mocked(axios, true)

describe('dashboardsApi', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('list calls GET /dashboards', async () => {
    const mockData = [{ slug: 'ventas', title: 'Ventas', updated_at: '2024-01-01' }]
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { data: mockData } })

    const result = await dashboardsApi.list()
    expect(result).toEqual(mockData)
  })

  it('get calls GET /dashboards/:slug', async () => {
    const config = { title: 'Ventas', version: '1.0' }
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { data: config } })

    const result = await dashboardsApi.get('ventas')
    expect(result).toEqual(config)
  })

  it('query calls POST /dashboards/:slug/query', async () => {
    const rows = [{ total: 100 }]
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: { data: rows, count: 1, meta: {} } })

    const result = await dashboardsApi.query('ventas', [])
    expect(result.data).toEqual(rows)
  })

  it('propagates errors', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValueOnce(new Error('Network error'))
    await expect(dashboardsApi.list()).rejects.toThrow('Network error')
  })
})

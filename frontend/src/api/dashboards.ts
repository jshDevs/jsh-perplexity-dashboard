import { apiClient } from './client'
import type {
  DashboardListItem,
  DashboardConfig,
  QueryFilter,
  QueryResult,
  AnomalyResult,
  ForecastResult,
  DatasetSchema,
} from '@/types/dashboard'

export const dashboardsApi = {
  list: async (): Promise<DashboardListItem[]> => {
    const { data } = await apiClient.get('/dashboards')
    return data.data
  },

  get: async (slug: string): Promise<DashboardConfig> => {
    const { data } = await apiClient.get(`/dashboards/${slug}`)
    return data.data
  },

  query: async (
    slug: string,
    filters: QueryFilter[] = [],
    params: Record<string, unknown> = {}
  ): Promise<QueryResult> => {
    const { data } = await apiClient.post(`/dashboards/${slug}/query`, { filters, params })
    return data
  },

  anomalies: async (
    slug: string,
    values: number[],
    algorithm = 'auto'
  ): Promise<AnomalyResult> => {
    const { data } = await apiClient.post(`/dashboards/${slug}/anomalies`, { values, algorithm })
    return data.data
  },

  forecast: async (
    slug: string,
    values: number[],
    season = 12,
    horizon = 12
  ): Promise<ForecastResult> => {
    const { data } = await apiClient.post(`/dashboards/${slug}/forecast`, {
      values, season, horizon,
    })
    return data.data
  },
}

export const ingestApi = {
  file: async (file: File): Promise<{ data: { dataset_id: string; schema: DatasetSchema; chart_hint: unknown } }> => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await apiClient.post('/ingest/file', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  json: async (payload: unknown): Promise<{ data: { dataset_id: string; schema: DatasetSchema } }> => {
    const { data } = await apiClient.post('/ingest/json', { payload })
    return data
  },

  sql: async (sql: string): Promise<{ data: { dataset_id: string; ast_columns: unknown[] } }> => {
    const { data } = await apiClient.post('/ingest/sql', { sql })
    return data
  },

  getSchema: async (datasetId: string): Promise<DatasetSchema> => {
    const { data } = await apiClient.get(`/schema/${datasetId}`)
    return data.data
  },

  overrideColumn: async (
    datasetId: string,
    column: string,
    type: string
  ): Promise<void> => {
    await apiClient.patch(`/schema/${datasetId}/columns/${column}`, { type })
  },
}

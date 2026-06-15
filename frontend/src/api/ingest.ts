/**
 * ingest.ts — cliente HTTP para el pipeline de ingesta.
 * Toda comunicación con /api/v1/ingest y /api/v1/datasets.
 */
import axios from 'axios'

const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api/v1'

export interface IngestResponse {
  datasetId: string
  filename:  string
  format:    'csv' | 'excel' | 'json'
  rowCount:  number
  columns:   string[]
  sheets?:   string[]
  warnings:  string[]
}

export interface DatasetMeta {
  datasetId: string
  filename:  string
  format:    string
  rowCount:  number
  columns:   string[]
  sheets?:   string[]
  warnings:  string[]
}

export interface DatasetRowsResponse {
  rows:     Record<string, unknown>[]
  total:    number
  page:     number
  pageSize: number
}

export async function uploadFile(
  file:       File,
  sheetName?: string,
  onProgress?: (pct: number) => void,
): Promise<IngestResponse> {
  const form = new FormData()
  form.append('file', file)
  if (sheetName) form.append('sheet', sheetName)

  const { data } = await axios.post<IngestResponse>(`${BASE}/ingest`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100))
    },
  })
  return data
}

export async function fetchDatasetMeta(datasetId: string): Promise<DatasetMeta> {
  const { data } = await axios.get<DatasetMeta>(`${BASE}/datasets/${datasetId}`)
  return data
}

export async function fetchDatasetRows(
  datasetId: string,
  page:     number = 1,
  pageSize: number = 200,
): Promise<DatasetRowsResponse> {
  const { data } = await axios.get<DatasetRowsResponse>(
    `${BASE}/datasets/${datasetId}/rows`,
    { params: { page, pageSize } },
  )
  return data
}

export async function deleteDataset(datasetId: string): Promise<void> {
  await axios.delete(`${BASE}/datasets/${datasetId}`)
}

export async function listDatasets(): Promise<string[]> {
  const { data } = await axios.get<{ datasetIds: string[] }>(`${BASE}/datasets`)
  return data.datasetIds
}

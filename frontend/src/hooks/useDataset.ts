/**
 * useDataset — hook para cargar rows paginadas de un dataset
 * ya ingestado. Usado por DatasetPreviewTable.
 */
import { useState, useEffect, useCallback } from 'react'
import { fetchDatasetRows } from '@/api/ingest'
import type { DatasetRowsResponse } from '@/api/ingest'

interface UseDatasetOpts {
  datasetId: string | null
  pageSize?: number
}

export function useDataset({ datasetId, pageSize = 100 }: UseDatasetOpts) {
  const [data,    setData]    = useState<DatasetRowsResponse | null>(null)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async (p: number) => {
    if (!datasetId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetchDatasetRows(datasetId, p, pageSize)
      setData(res)
      setPage(p)
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Error cargando rows')
    } finally {
      setLoading(false)
    }
  }, [datasetId, pageSize])

  useEffect(() => { load(1) }, [load])

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0

  return { data, page, totalPages, loading, error, goTo: load }
}

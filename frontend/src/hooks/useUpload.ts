/**
 * useUpload — máquina de estados para el ciclo de vida de un upload:
 *   idle → uploading → parsing → done → error
 *
 * Separa la responsabilidad de upload/fetch de la lógica de UI.
 */
import { useState, useCallback } from 'react'
import { uploadFile, fetchDatasetRows } from '@/api/ingest'
import type { IngestResponse } from '@/api/ingest'

export type UploadState =
  | { stage: 'idle' }
  | { stage: 'uploading'; progress: number }
  | { stage: 'parsing' }
  | { stage: 'done'; meta: IngestResponse; rows: Record<string, unknown>[] }
  | { stage: 'error'; message: string }

export function useUpload() {
  const [state, setState] = useState<UploadState>({ stage: 'idle' })

  const upload = useCallback(async (file: File, sheetName?: string) => {
    setState({ stage: 'uploading', progress: 0 })
    try {
      const meta = await uploadFile(file, sheetName, (pct) => {
        setState({ stage: 'uploading', progress: pct })
      })

      setState({ stage: 'parsing' })

      // Fetch primera página de rows para alimentar inferencia client-side
      const { rows } = await fetchDatasetRows(meta.datasetId, 1, 300)

      setState({ stage: 'done', meta, rows })
    } catch (err: any) {
      const message =
        err?.response?.data?.error ??
        err?.message ??
        'Error desconocido en la subida'
      setState({ stage: 'error', message })
    }
  }, [])

  const reset = useCallback(() => setState({ stage: 'idle' }), [])

  return { state, upload, reset }
}

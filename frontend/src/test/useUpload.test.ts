import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpload } from '@/hooks/useUpload'

// Mock api/ingest
vi.mock('@/api/ingest', () => ({
  uploadFile: vi.fn(),
  fetchDatasetRows: vi.fn(),
}))

import * as api from '@/api/ingest'

describe('useUpload state machine', () => {
  beforeEach(() => vi.clearAllMocks())

  it('inicia en idle', () => {
    const { result } = renderHook(() => useUpload())
    expect(result.current.state.stage).toBe('idle')
  })

  it('transiciona a done tras upload exitoso', async () => {
    vi.mocked(api.uploadFile).mockResolvedValue({
      datasetId: 'uuid-1', filename: 'test.csv',
      format: 'csv', rowCount: 10, columns: ['a','b'], warnings: [],
    })
    vi.mocked(api.fetchDatasetRows).mockResolvedValue({
      rows: [{ a: 1, b: 2 }], total: 10, page: 1, pageSize: 300,
    })

    const { result } = renderHook(() => useUpload())
    await act(async () => {
      await result.current.upload(new File(['a,b\n1,2'], 'test.csv', { type: 'text/csv' }))
    })
    expect(result.current.state.stage).toBe('done')
    if (result.current.state.stage === 'done') {
      expect(result.current.state.meta.datasetId).toBe('uuid-1')
      expect(result.current.state.rows).toHaveLength(1)
    }
  })

  it('transiciona a error si falla la API', async () => {
    vi.mocked(api.uploadFile).mockRejectedValue({
      message: 'Network error',
      response: { data: { error: 'Archivo demasiado grande' } },
    })

    const { result } = renderHook(() => useUpload())
    await act(async () => {
      await result.current.upload(new File(['x'], 'big.csv', { type: 'text/csv' }))
    })
    expect(result.current.state.stage).toBe('error')
    if (result.current.state.stage === 'error') {
      expect(result.current.state.message).toContain('grande')
    }
  })

  it('reset vuelve a idle', async () => {
    vi.mocked(api.uploadFile).mockResolvedValue({
      datasetId: 'x', filename: 'f.csv', format: 'csv',
      rowCount: 1, columns: ['a'], warnings: [],
    })
    vi.mocked(api.fetchDatasetRows).mockResolvedValue({
      rows: [], total: 0, page: 1, pageSize: 300,
    })
    const { result } = renderHook(() => useUpload())
    await act(async () => {
      await result.current.upload(new File(['a\n1'], 'f.csv', { type: 'text/csv' }))
    })
    act(() => result.current.reset())
    expect(result.current.state.stage).toBe('idle')
  })
})

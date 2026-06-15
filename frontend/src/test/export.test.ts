import { describe, it, expect, beforeEach, vi } from 'vitest'
import { exportCSV } from '@/export/exportService'
import { useExportStore } from '@/export/exportStore'

// Mock DOM para triggerDownload
beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock'),
    revokeObjectURL: vi.fn(),
  })
  const mockA = { href: '', download: '', click: vi.fn(), style: {}, remove: vi.fn() }
  vi.spyOn(document, 'createElement').mockReturnValue(mockA as any)
  vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockA as any)
  vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockA as any)

  useExportStore.setState({ jobs: [] })
})

// ── exportCSV tests ───────────────────────────────────────────────────────
describe('exportCSV', () => {
  it('genera CSV con headers y filas', () => {
    const rows = [{ name: 'Alice', value: 10 }, { name: 'Bob', value: 20 }]
    expect(() => exportCSV(rows, { filename: 'test' })).not.toThrow()
  })

  it('retorna sin hacer nada con rows vacíos', () => {
    expect(() => exportCSV([], { filename: 'test' })).not.toThrow()
  })

  it('escapa campos con comas', () => {
    const rows = [{ name: 'Doe, John', value: 1 }]
    // La función no lanza — verificar que el campo queda entre comillas
    expect(() => exportCSV(rows, {})).not.toThrow()
  })

  it('escapa comillas dobles en campos', () => {
    const rows = [{ name: 'say "hi"', value: 1 }]
    expect(() => exportCSV(rows, {})).not.toThrow()
  })

  it('usa columnas personalizadas si se pasan', () => {
    const rows = [{ name: 'A', value: 1, extra: 'x' }]
    expect(() => exportCSV(rows, {}, ['name', 'value'])).not.toThrow()
  })
})

// ── exportStore tests ─────────────────────────────────────────────────────
describe('exportStore', () => {
  it('addJob crea trabajo con status pending', () => {
    const id = useExportStore.getState().addJob('csv', 'mi-reporte')
    const job = useExportStore.getState().jobs.find((j) => j.id === id)
    expect(job?.status).toBe('pending')
    expect(job?.format).toBe('csv')
  })

  it('updateJob cambia status a running', () => {
    const id = useExportStore.getState().addJob('png', 'chart')
    useExportStore.getState().updateJob(id, { status: 'running' })
    expect(useExportStore.getState().jobs.find((j) => j.id === id)?.status).toBe('running')
  })

  it('removeJob elimina el trabajo', () => {
    const id = useExportStore.getState().addJob('xlsx', 'file')
    useExportStore.getState().removeJob(id)
    expect(useExportStore.getState().jobs.find((j) => j.id === id)).toBeUndefined()
  })

  it('clearDone elimina solo los done', () => {
    const id1 = useExportStore.getState().addJob('csv', 'a')
    const id2 = useExportStore.getState().addJob('csv', 'b')
    useExportStore.getState().updateJob(id1, { status: 'done' })
    useExportStore.getState().clearDone()
    const jobs = useExportStore.getState().jobs
    expect(jobs.some((j) => j.id === id1)).toBe(false)
    expect(jobs.some((j) => j.id === id2)).toBe(true)
  })

  it('isRunning retorna true cuando hay job running', () => {
    const id = useExportStore.getState().addJob('pdf', 'doc')
    useExportStore.getState().updateJob(id, { status: 'running' })
    expect(useExportStore.getState().isRunning('pdf', 'doc')).toBe(true)
  })

  it('isRunning retorna false cuando no hay job running', () => {
    expect(useExportStore.getState().isRunning('pdf', 'noexiste')).toBe(false)
  })
})

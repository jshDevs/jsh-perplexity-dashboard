/**
 * exportStore — cola de exportaciones en curso.
 * Permite mostrar progreso global y evitar exports duplicados.
 */
import { create } from 'zustand'
import { nanoid } from 'nanoid'

export type ExportFormat = 'png' | 'pdf' | 'csv' | 'xlsx'
export type ExportStatus = 'pending' | 'running' | 'done' | 'error'

export interface ExportJob {
  id:        string
  format:    ExportFormat
  filename:  string
  status:    ExportStatus
  error?:    string
  startedAt: number
  endedAt?:  number
}

interface ExportState {
  jobs:       ExportJob[]
  addJob:     (format: ExportFormat, filename: string) => string
  updateJob:  (id: string, patch: Partial<ExportJob>) => void
  removeJob:  (id: string) => void
  clearDone:  () => void
  isRunning:  (format: ExportFormat, filename: string) => boolean
}

export const useExportStore = create<ExportState>()((set, get) => ({
  jobs: [],

  addJob: (format, filename) => {
    const id = nanoid(8)
    set((s) => ({
      jobs: [...s.jobs, { id, format, filename, status: 'pending', startedAt: Date.now() }],
    }))
    return id
  },

  updateJob: (id, patch) => set((s) => ({
    jobs: s.jobs.map((j) => j.id === id ? { ...j, ...patch } : j),
  })),

  removeJob: (id) => set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) })),

  clearDone: () => set((s) => ({ jobs: s.jobs.filter((j) => j.status !== 'done') })),

  isRunning: (format, filename) =>
    get().jobs.some((j) => j.format === format && j.filename === filename && j.status === 'running'),
}))

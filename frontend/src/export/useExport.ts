/**
 * useExport — hook que conecta ExportService + ExportStore.
 * Expone funciones tipadas para disparar cada tipo de export.
 */
import { useCallback, useRef } from 'react'
import { useExportStore }     from './exportStore'
import {
  exportChartPNG,
  exportChartPDF,
  exportCSV,
  exportXLSX,
  type ExportOptions,
} from './exportService'

interface UseExportOptions {
  defaultFilename?: string
  defaultTitle?:   string
}

export function useExport(opts: UseExportOptions = {}) {
  const { addJob, updateJob, isRunning } = useExportStore()
  const chartRef = useRef<HTMLDivElement | null>(null)  // ref al DOM del chart
  const echartsRef = useRef<any>(null)                  // ref a la instancia ECharts

  const run = useCallback(async (
    format: 'png' | 'pdf' | 'csv' | 'xlsx',
    fn: () => void | Promise<void>,
    filename: string,
  ) => {
    if (isRunning(format, filename)) return
    const jobId = addJob(format, filename)
    updateJob(jobId, { status: 'running' })
    try {
      await fn()
      updateJob(jobId, { status: 'done', endedAt: Date.now() })
      setTimeout(() => useExportStore.getState().removeJob(jobId), 3000)
    } catch (e: any) {
      updateJob(jobId, { status: 'error', error: e?.message ?? 'Error desconocido', endedAt: Date.now() })
    }
  }, [addJob, updateJob, isRunning])

  const png = useCallback((exportOpts: ExportOptions = {}) => {
    const filename = exportOpts.filename ?? opts.defaultFilename ?? 'chart'
    run('png', () => {
      if (!echartsRef.current) throw new Error('Sin instancia ECharts')
      exportChartPNG(echartsRef.current, { ...exportOpts, filename })
    }, filename)
  }, [run, opts.defaultFilename])

  const pdf = useCallback(async (exportOpts: ExportOptions = {}) => {
    const filename = exportOpts.filename ?? opts.defaultFilename ?? 'chart'
    await run('pdf', async () => {
      if (!chartRef.current) throw new Error('Sin referencia al DOM')
      await exportChartPDF(chartRef.current, {
        title: opts.defaultTitle,
        ...exportOpts,
        filename,
      })
    }, filename)
  }, [run, opts.defaultFilename, opts.defaultTitle])

  const csv = useCallback((rows: Record<string, unknown>[], exportOpts: ExportOptions = {}, columns?: string[]) => {
    const filename = exportOpts.filename ?? opts.defaultFilename ?? 'export'
    run('csv', () => exportCSV(rows, { ...exportOpts, filename }, columns), filename)
  }, [run, opts.defaultFilename])

  const xlsx = useCallback(async (
    data: Record<string, unknown>[] | Record<string, Record<string, unknown>[]>,
    exportOpts: ExportOptions = {},
  ) => {
    const filename = exportOpts.filename ?? opts.defaultFilename ?? 'export'
    await run('xlsx', () => exportXLSX(data, { title: opts.defaultTitle, ...exportOpts, filename }), filename)
  }, [run, opts.defaultFilename, opts.defaultTitle])

  return { png, pdf, csv, xlsx, chartRef, echartsRef }
}

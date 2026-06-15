/**
 * ExportMenu — dropdown de opciones de exportación en ChartCard.
 *
 * Muestra: PNG · PDF · CSV · Excel
 * Usa useExport internamente. El botón de trigger es un icono Download.
 */
import { useState, useRef, useEffect } from 'react'
import { Download, Image, FileText, Table, FileSpreadsheet, Loader2 } from 'lucide-react'
import { useExport }      from '@/export/useExport'
import { useExportStore } from '@/export/exportStore'

interface Props {
  title:     string
  rows:      Record<string, unknown>[]
  echartsInstance?: any
  domElement?:      HTMLElement | null
}

const ITEMS = [
  { format: 'png'  as const, label: 'PNG',    icon: Image          },
  { format: 'pdf'  as const, label: 'PDF',    icon: FileText       },
  { format: 'csv'  as const, label: 'CSV',    icon: Table          },
  { format: 'xlsx' as const, label: 'Excel',  icon: FileSpreadsheet },
]

export default function ExportMenu({ title, rows, echartsInstance, domElement }: Props) {
  const [open, setOpen] = useState(false)
  const ref            = useRef<HTMLDivElement>(null)
  const filename       = title.toLowerCase().replace(/\s+/g, '-')

  const { png, pdf, csv, xlsx, echartsRef, chartRef } = useExport({
    defaultFilename: filename,
    defaultTitle:    title,
  })

  // Inyectar refs externos si se pasan como props
  useEffect(() => { if (echartsInstance) (echartsRef as any).current = echartsInstance }, [echartsInstance])
  useEffect(() => { if (domElement)      (chartRef    as any).current = domElement     }, [domElement])

  // Cerrar al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const jobs    = useExportStore((s) => s.jobs)
  const running = jobs.some((j) => j.filename === filename && j.status === 'running')

  const handleExport = (format: 'png' | 'pdf' | 'csv' | 'xlsx') => {
    setOpen(false)
    if (format === 'png')  png()
    if (format === 'pdf')  pdf()
    if (format === 'csv')  csv(rows)
    if (format === 'xlsx') xlsx(rows)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Exportar"
        className="icon-btn"
        disabled={running}
      >
        {running
          ? <Loader2 size={12} className="animate-spin" />
          : <Download size={12} />}
      </button>

      {open && (
        <div className="absolute right-0 top-6 z-50 w-36 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          {ITEMS.map(({ format, label, icon: Icon }) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-fast"
            >
              <Icon size={11} className="text-slate-500" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

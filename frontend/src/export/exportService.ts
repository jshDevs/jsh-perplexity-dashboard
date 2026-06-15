/**
 * exportService.ts — Export de charts y datasets en 4 formatos.
 *
 * PNG  → ECharts getDataURL() (canvas nativo, sin dependencias)
 * PDF  → jsPDF + html2canvas (renderiza el DOM del chart)
 * CSV  → generación manual RFC 4180
 * XLSX → librería 'xlsx' (SheetJS community edition, licencia Apache-2.0)
 *
 * Todos los métodos son async y retornan void (disparan descarga).
 */

// ── Tipos ──────────────────────────────────────────────────────────────────
export interface ExportOptions {
  filename?: string
  title?:    string
  author?:   string
}

// ── PNG ────────────────────────────────────────────────────────────────────
/**
 * Exporta un chart ECharts a PNG.
 * @param chartInstance  instancia ECharts (echarts.init retorna)
 * @param opts           opciones de nombre de archivo
 */
export function exportChartPNG(
  chartInstance: any,
  opts: ExportOptions = {},
): void {
  const dataUrl = chartInstance.getDataURL({
    type:            'png',
    pixelRatio:      2,
    backgroundColor: '#1e293b',  // slate-800
  })
  triggerDownload(dataUrl, `${opts.filename ?? 'chart'}.png`)
}

// ── PDF ────────────────────────────────────────────────────────────────────
/**
 * Exporta un elemento DOM a PDF usando html2canvas + jsPDF.
 * Renderiza el chart tal como se ve en pantalla.
 */
export async function exportChartPDF(
  element: HTMLElement,
  opts: ExportOptions = {},
): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const canvas = await html2canvas(element, {
    scale:           2,
    backgroundColor: '#1e293b',
    useCORS:         false,   // offline-first: sin CORS externo
    logging:         false,
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf     = new jsPDF({
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    unit:        'px',
    format:      [canvas.width / 2, canvas.height / 2],
  })

  if (opts.title) {
    pdf.setFontSize(10)
    pdf.setTextColor(150)
    pdf.text(opts.title, 10, 14)
  }

  pdf.addImage(imgData, 'PNG', 0, opts.title ? 20 : 0, canvas.width / 2, canvas.height / 2)
  pdf.save(`${opts.filename ?? 'chart'}.pdf`)
}

// ── CSV ────────────────────────────────────────────────────────────────────
/**
 * Exporta rows como CSV RFC 4180.
 * Escapa campos con comas, comillas y saltos de línea.
 */
export function exportCSV(
  rows:    Record<string, unknown>[],
  opts:    ExportOptions = {},
  columns?: string[],
): void {
  if (rows.length === 0) return
  const cols = columns ?? Object.keys(rows[0])

  const escape = (v: unknown): string => {
    const s = v == null ? '' : String(v)
    return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const lines = [
    cols.map(escape).join(','),
    ...rows.map((r) => cols.map((c) => escape(r[c])).join(',')),
  ]

  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(URL.createObjectURL(blob), `${opts.filename ?? 'export'}.csv`)
}

// ── XLSX ───────────────────────────────────────────────────────────────────
/**
 * Exporta rows a Excel (.xlsx) usando SheetJS (xlsx, Apache-2.0).
 * Soporta múltiples hojas si se pasa un Record<sheetName, rows[]>.
 */
export async function exportXLSX(
  data:    Record<string, unknown>[] | Record<string, Record<string, unknown>[]>,
  opts:    ExportOptions = {},
): Promise<void> {
  const XLSX = await import('xlsx')

  const wb = XLSX.utils.book_new()

  // Detectar si es multi-hoja (objeto de objetos) o array simple
  const isMultiSheet = !Array.isArray(data) && typeof data === 'object'

  if (isMultiSheet) {
    for (const [sheetName, rows] of Object.entries(data as Record<string, Record<string, unknown>[]>)) {
      const ws = XLSX.utils.json_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
    }
  } else {
    const ws = XLSX.utils.json_to_sheet(data as Record<string, unknown>[])
    XLSX.utils.book_append_sheet(wb, ws, opts.title?.slice(0, 31) ?? 'Sheet1')
  }

  XLSX.writeFile(wb, `${opts.filename ?? 'export'}.xlsx`)
}

// ── Util ───────────────────────────────────────────────────────────────────
function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a')
  a.href     = href
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Liberar ObjectURL si aplica
  if (href.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(href), 10_000)
}

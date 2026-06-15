/**
 * FileDropZone — zona de drag-and-drop para archivos CSV/Excel/JSON.
 * Soporta click-to-browse, drag-over visual y validación de extensión.
 */
import { useRef, useState, useCallback } from 'react'
import { Upload, FileJson, FileSpreadsheet, FileText } from 'lucide-react'

const ACCEPTED = ['.csv', '.xlsx', '.xls', '.json']
const ACCEPT   = ACCEPTED.join(',')

const ICONS: Record<string, JSX.Element> = {
  csv:   <FileText      size={32} className="text-emerald-400" />,
  xlsx:  <FileSpreadsheet size={32} className="text-green-400" />,
  xls:   <FileSpreadsheet size={32} className="text-green-400" />,
  json:  <FileJson      size={32} className="text-amber-400" />,
}

interface Props {
  onFile:   (file: File) => void
  disabled?: boolean
}

export default function FileDropZone({ onFile, disabled }: Props) {
  const inputRef   = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ACCEPTED.includes(`.${ext}`)) {
      alert(`Formato no soportado: .${ext}\nAceptados: ${ACCEPTED.join(', ')}`)
      return
    }
    onFile(file)
  }, [onFile])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }, [handleFile])

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={[
        'relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed',
        'cursor-pointer transition-fast select-none min-h-[180px] p-8',
        dragging
          ? 'border-indigo-400 bg-indigo-900/20 scale-[1.01]'
          : 'border-slate-600 hover:border-slate-400 bg-slate-800/50',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={onInputChange}
        className="hidden"
        disabled={disabled}
      />

      <div className="flex gap-3">
        {Object.values(ICONS)}
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-slate-200">
          {dragging ? 'Suelta el archivo aquí' : 'Arrastra un archivo o haz clic para seleccionar'}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          CSV · Excel (.xlsx/.xls) · JSON · hasta {parseInt(import.meta.env.VITE_MAX_MB ?? '50')} MB
        </p>
      </div>
    </div>
  )
}

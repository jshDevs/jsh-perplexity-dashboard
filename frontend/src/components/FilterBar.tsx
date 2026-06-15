/**
 * FilterBar — barra de filtros activos con chips removibles.
 *
 * Muestra cada filtro como un chip: "zona: Norte, Sur ✕"
 * Incluye botón "Limpiar todo" y botón "Copiar link" (URL con filtros).
 */
import { X, Link, Filter } from 'lucide-react'
import { useFilterStore }  from '@/store/filterStore'
import { buildShareUrl }   from '@/store/filterUrlSync'

export default function FilterBar() {
  const filters    = useFilterStore((s) => s.filters)
  const clearFilter = useFilterStore((s) => s.clearFilter)
  const clearAll    = useFilterStore((s) => s.clearAll)

  if (filters.length === 0) return null

  const handleCopyLink = () => {
    const url = buildShareUrl(filters)
    navigator.clipboard.writeText(url).then(() => {
      // Feedback visual breve — sin toast dep extra
      const btn = document.getElementById('copy-filter-link')
      if (btn) { btn.textContent = '✓ Copiado'; setTimeout(() => { if(btn) btn.textContent = 'Copiar link' }, 1500) }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-slate-800/70 border border-slate-700 rounded-xl">
      <Filter size={13} className="text-slate-500 shrink-0" />

      {filters.map((f) => (
        <span
          key={f.field}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-900/60 border border-indigo-600 rounded-full text-xs text-indigo-200"
        >
          <span className="font-medium text-indigo-300">{f.field}:</span>
          <span className="max-w-[160px] truncate">
            {f.values.slice(0, 3).join(', ')}
            {f.values.length > 3 ? ` +${f.values.length - 3}` : ''}
          </span>
          <button
            onClick={() => clearFilter(f.field)}
            className="ml-0.5 hover:text-white transition-fast"
            aria-label={`Quitar filtro ${f.field}`}
          >
            <X size={11} />
          </button>
        </span>
      ))}

      <div className="ml-auto flex items-center gap-2">
        <button
          id="copy-filter-link"
          onClick={handleCopyLink}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-fast"
        >
          <Link size={11} /> Copiar link
        </button>
        <button
          onClick={clearAll}
          className="text-xs text-slate-500 hover:text-red-400 transition-fast"
        >
          Limpiar todo
        </button>
      </div>
    </div>
  )
}

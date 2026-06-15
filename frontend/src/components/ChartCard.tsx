/**
 * ChartCard — contenedor drag-and-drop de un chart en el Builder.
 * Usa useSortable de @dnd-kit/sortable para drag handle.
 * Controles: rename, resize, pin, remove.
 */
import { useSortable }     from '@dnd-kit/sortable'
import { CSS }             from '@dnd-kit/utilities'
import { useState }        from 'react'
import {
  GripVertical, Pin, PinOff, Maximize2, Minimize2,
  Pencil, Trash2, Check, X,
} from 'lucide-react'
import DynamicChart          from '@/components/DynamicChart'
import { useDashboardStore } from '@/store/dashboardStore'
import type { DashboardItem } from '@/store/dashboardStore'

const SIZE_COLS: Record<DashboardItem['size'], string> = {
  sm: 'col-span-1',
  md: 'col-span-1 lg:col-span-1',
  lg: 'col-span-1 lg:col-span-2',
  xl: 'col-span-1 lg:col-span-3',
}

const SIZE_CYCLE: DashboardItem['size'][] = ['sm', 'md', 'lg', 'xl']

interface Props {
  item:     DashboardItem
  dashId:   string
  rows:     Record<string, unknown>[]
}

export default function ChartCard({ item, dashId, rows }: Props) {
  const { removeItem, renameItem, resizeItem, togglePin } = useDashboardStore()
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(item.title)

  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: item.id, disabled: item.pinned })

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.5 : 1,
  }

  const cycleSize = () => {
    const cur = SIZE_CYCLE.indexOf(item.size)
    resizeItem(dashId, item.id, SIZE_CYCLE[(cur + 1) % SIZE_CYCLE.length])
  }

  const confirmRename = () => {
    if (draft.trim()) renameItem(dashId, item.id, draft.trim())
    setEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        SIZE_COLS[item.size],
        'bg-slate-800 border rounded-xl overflow-hidden flex flex-col',
        item.pinned ? 'border-indigo-600/60' : 'border-slate-700',
        isDragging  ? 'shadow-2xl ring-2 ring-indigo-500' : '',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700 bg-slate-800/80">
        {/* Drag handle */}
        <button
          {...attributes} {...listeners}
          className={[
            'text-slate-500 hover:text-slate-300 transition-fast cursor-grab active:cursor-grabbing',
            item.pinned ? 'opacity-20 cursor-not-allowed' : '',
          ].join(' ')}
          disabled={item.pinned}
          aria-label="Arrastrar"
        >
          <GripVertical size={14} />
        </button>

        {/* Título / edición inline */}
        {editing ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setEditing(false) }}
              className="flex-1 bg-slate-700 text-white text-xs rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button onClick={confirmRename}   className="text-emerald-400 hover:text-emerald-300"><Check size={12} /></button>
            <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-white"><X size={12} /></button>
          </div>
        ) : (
          <span
            className="flex-1 text-xs font-medium text-slate-200 truncate cursor-text"
            onDoubleClick={() => { setDraft(item.title); setEditing(true) }}
            title="Doble clic para renombrar"
          >
            {item.title}
          </span>
        )}

        {/* Controles */}
        <div className="flex items-center gap-1 ml-auto shrink-0">
          <button onClick={cycleSize}              title="Cambiar tamaño" className="icon-btn">
            {item.size === 'xl' || item.size === 'lg'
              ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
          <button onClick={() => { setDraft(item.title); setEditing(true) }} title="Renombrar" className="icon-btn">
            <Pencil size={12} />
          </button>
          <button onClick={() => togglePin(dashId, item.id)} title={item.pinned ? 'Desfijar' : 'Fijar'} className="icon-btn">
            {item.pinned ? <PinOff size={12} /> : <Pin size={12} />}
          </button>
          <button onClick={() => removeItem(dashId, item.id)} title="Eliminar" className="icon-btn text-red-400 hover:text-red-300">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 p-1">
        <DynamicChart
          chart={item.chart}
          data={rows}
          datasetId={item.datasetId}
          height={item.size === 'xl' ? 420 : item.size === 'lg' ? 340 : 260}
        />
      </div>
    </div>
  )
}

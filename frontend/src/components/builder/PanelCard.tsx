/**
 * PanelCard — panel individual con:
 *   - Handle de drag (dnd-kit)
 *   - Toolbar: rename, resize, pin, delete
 *   - Slot para el chart (DynamicChart)
 */
import { useSortable }      from '@dnd-kit/sortable'
import { CSS }              from '@dnd-kit/utilities'
import { useState }         from 'react'
import { GripVertical, Pin, PinOff, Trash2, Maximize2, Pencil, Check } from 'lucide-react'
import { useDashboardStore } from '@/store/dashboardStore'
import type { Panel, PanelSize } from '@/store/dashboardStore'
import DynamicChart          from '@/components/DynamicChart'

const SIZES: PanelSize[] = ['1x1', '1x2', '2x1', '2x2', '1x3', '3x1']

const sizeToColSpan: Record<PanelSize, string> = {
  '1x1': 'col-span-1 row-span-1',
  '1x2': 'col-span-2 row-span-1',
  '2x1': 'col-span-1 row-span-2',
  '2x2': 'col-span-2 row-span-2',
  '1x3': 'col-span-3 row-span-1',
  '3x1': 'col-span-1 row-span-3',
}

interface Props {
  panel:       Panel
  dashboardId: string
}

export function PanelCard({ panel, dashboardId }: Props) {
  const updatePanel  = useDashboardStore((s) => s.updatePanel)
  const removePanel  = useDashboardStore((s) => s.removePanel)
  const pinPanel     = useDashboardStore((s) => s.pinPanel)

  const [editing, setEditing] = useState(false)
  const [title,   setTitle]   = useState(panel.title)
  const [showSize, setShowSize] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: panel.id })

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.5 : 1,
  }

  function commitTitle() {
    updatePanel(dashboardId, panel.id, { title })
    setEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-slate-800/70 border border-slate-700 rounded-xl flex flex-col
        ${sizeToColSpan[panel.size]}
        ${panel.pinned ? 'border-indigo-600 ring-1 ring-indigo-600/40' : ''}
      `}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-700">
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300"
        >
          <GripVertical size={14} />
        </span>

        {/* Title */}
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => e.key === 'Enter' && commitTitle()}
            className="flex-1 bg-transparent border-b border-indigo-500 text-sm text-white outline-none"
          />
        ) : (
          <span className="flex-1 text-sm text-slate-200 truncate">{panel.title}</span>
        )}

        {/* Acciones */}
        <button onClick={() => setEditing(true)}  title="Renombrar" className="text-slate-500 hover:text-white">
          {editing ? <Check size={13} /> : <Pencil size={13} />}
        </button>

        <div className="relative">
          <button onClick={() => setShowSize((v) => !v)} title="Tamaño" className="text-slate-500 hover:text-white">
            <Maximize2 size={13} />
          </button>
          {showSize && (
            <div className="absolute top-6 right-0 bg-slate-900 border border-slate-700 rounded-lg p-2 z-50 flex flex-wrap gap-1 w-36">
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => { updatePanel(dashboardId, panel.id, { size: s }); setShowSize(false) }}
                  className={`px-2 py-0.5 rounded text-xs ${
                    panel.size === s ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => pinPanel(dashboardId, panel.id, !panel.pinned)}
          title={panel.pinned ? 'Desfijar' : 'Fijar arriba'}
          className={panel.pinned ? 'text-indigo-400' : 'text-slate-500 hover:text-indigo-400'}
        >
          {panel.pinned ? <Pin size={13} /> : <PinOff size={13} />}
        </button>

        <button
          onClick={() => removePanel(dashboardId, panel.id)}
          title="Eliminar panel"
          className="text-slate-500 hover:text-red-400"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Chart slot */}
      <div className="flex-1 p-2 min-h-[220px]">
        <DynamicChart
          chartId={panel.id}
          datasetId={panel.datasetId}
          chartType={panel.chartType as any}
          config={panel.config}
        />
      </div>
    </div>
  )
}

/**
 * DashboardBuilderPage — /builder
 *
 * Flujo:
 *   1. Sidebar izquierdo: lista de dashboards + crear nuevo
 *   2. Canvas central: DnDContext + SortableContext (dnd-kit)
 *      - ChartCard por cada item (drag handle, resize, pin, remove)
 *   3. Panel derecho (toggle): AddChartPanel con recomendaciones
 *   4. Toolbar superior: nombre dashboard, save to Redis, share URL
 *
 * El dataset activo se obtiene del filterStore o de sessionStorage
 * (el usuario llegó desde /infer con un datasetId).
 */
import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import {
  Plus, Save, Share2, LayoutDashboard,
  ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react'

import { useDashboardStore }  from '@/store/dashboardStore'
import { saveDashboard }      from '@/api/dashboards'
import { fetchDatasetRows }   from '@/api/ingest'
import { useInference }       from '@/inference/useInference'
import ChartCard              from '@/components/ChartCard'
import AddChartPanel          from '@/components/AddChartPanel'
import FilterBar              from '@/components/FilterBar'
import { useFilterUrlSync }   from '@/store/filterUrlSync'

const SIZE_GRID = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'

export default function DashboardBuilderPage() {
  useFilterUrlSync()   // hidratar filtros desde URL

  const {
    dashboards, activeDashboardId,
    createDashboard, setActive, renameDashboard,
    reorderItems, getActive,
  } = useDashboardStore()

  const active = getActive()

  // Dataset activo (pasado por sessionStorage desde /infer)
  const [datasetId, setDatasetId] = useState<string | null>(
    () => sessionStorage.getItem('active_dataset_id')
  )
  const [rows,    setRows]    = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [newDashName, setNewDashName] = useState('')

  // Inferencia sobre rows cargados
  const { recommendations, isReady } = useInference(
    rows.length > 0 ? rows : undefined
  )

  // Cargar rows del dataset activo
  useEffect(() => {
    if (!datasetId) return
    setLoading(true)
    fetchDatasetRows(datasetId, 1, 300)
      .then((res) => setRows(res.rows))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [datasetId])

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor,  { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (!active) return
    const { active: a, over } = event
    if (!over || a.id === over.id) return
    const ids      = active.items.map((i) => i.id)
    const oldIdx   = ids.indexOf(String(a.id))
    const newIdx   = ids.indexOf(String(over.id))
    if (oldIdx === -1 || newIdx === -1) return
    const reordered = [...ids]
    reordered.splice(oldIdx, 1)
    reordered.splice(newIdx, 0, String(a.id))
    reorderItems(active.id, reordered)
  }, [active, reorderItems])

  const handleSave = async () => {
    if (!active) return
    setSaving(true)
    try { await saveDashboard(active) } catch {}
    finally { setSaving(false) }
  }

  const handleCreate = () => {
    const name = newDashName.trim() || `Dashboard ${dashboards.length + 1}`
    createDashboard(name)
    setNewDashName('')
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">

      {/* ── Sidebar izquierdo ──────────────────────────────────────────── */}
      <aside className={[
        'flex flex-col bg-slate-800 border-r border-slate-700 transition-all duration-200',
        sidebarOpen ? 'w-56' : 'w-12',
      ].join(' ')}>
        <div className="flex items-center justify-between px-3 py-3 border-b border-slate-700">
          {sidebarOpen && (
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <LayoutDashboard size={13} /> Dashboards
            </span>
          )}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="ml-auto text-slate-400 hover:text-white transition-fast"
          >
            {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>

        {sidebarOpen && (
          <>
            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
              {dashboards.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setActive(d.id)}
                  className={[
                    'w-full text-left px-2 py-1.5 rounded-lg text-xs transition-fast truncate',
                    activeDashboardId === d.id
                      ? 'bg-indigo-700 text-white'
                      : 'text-slate-400 hover:bg-slate-700 hover:text-white',
                  ].join(' ')}
                >
                  {d.name}
                </button>
              ))}
            </div>

            {/* Crear nuevo */}
            <div className="p-2 border-t border-slate-700 flex gap-1">
              <input
                placeholder="Nombre…"
                value={newDashName}
                onChange={(e) => setNewDashName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="flex-1 min-w-0 bg-slate-700 text-xs text-white rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={handleCreate}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-fast"
              >
                <Plus size={12} />
              </button>
            </div>
          </>
        )}
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Toolbar */}
        <header className="flex items-center gap-3 px-5 py-3 border-b border-slate-700 bg-slate-800/80 flex-wrap">
          {active ? (
            <input
              value={active.name}
              onChange={(e) => renameDashboard(active.id, e.target.value)}
              className="bg-transparent text-white font-semibold text-sm outline-none border-b border-transparent hover:border-slate-500 focus:border-indigo-500 transition-fast w-48"
            />
          ) : (
            <span className="text-sm text-slate-500">Selecciona o crea un dashboard</span>
          )}

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {/* Dataset picker */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Dataset:</span>
              <input
                placeholder="dataset-id"
                value={datasetId ?? ''}
                onChange={(e) => { setDatasetId(e.target.value); sessionStorage.setItem('active_dataset_id', e.target.value) }}
                className="w-40 bg-slate-700 rounded-lg px-2 py-1 text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={() => setShowAdd((v) => !v)}
              disabled={!active || !isReady}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs rounded-lg transition-fast"
            >
              <Plus size={12} /> Agregar chart
            </button>

            <button
              onClick={handleSave}
              disabled={!active || saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-xs rounded-lg transition-fast"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Guardar
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-fast"
            >
              <Share2 size={12} /> Compartir
            </button>
          </div>
        </header>

        {/* FilterBar */}
        <div className="px-5 pt-3">
          <FilterBar />
        </div>

        {/* Canvas DnD */}
        <main className="flex-1 flex gap-4 p-5 overflow-auto">
          {!active ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-slate-500">
                <LayoutDashboard size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Crea o selecciona un dashboard en el sidebar</p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={active.items.map((i) => i.id)}
                strategy={rectSortingStrategy}
              >
                <div className={`flex-1 ${SIZE_GRID}`}>
                  {active.items.length === 0 ? (
                    <div className="col-span-full flex items-center justify-center min-h-[300px]">
                      <div className="text-center text-slate-600">
                        <p className="text-sm">Dashboard vacío</p>
                        <p className="text-xs mt-1">Usa "Agregar chart" para añadir visualizaciones</p>
                      </div>
                    </div>
                  ) : (
                    active.items.map((item) => (
                      <ChartCard
                        key={item.id}
                        item={item}
                        dashId={active.id}
                        rows={rows}
                      />
                    ))
                  )}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Panel lateral de agregar charts */}
          {showAdd && active && isReady && (
            <AddChartPanel
              dashId={active.id}
              datasetId={datasetId ?? ''}
              recommendations={recommendations}
              onClose={() => setShowAdd(false)}
            />
          )}
        </main>
      </div>
    </div>
  )
}

/**
 * DashboardGrid — grid drag-and-drop con dnd-kit.
 * Soporta reordenamiento de paneles, pin (siempre primero) y resize.
 */
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, rectSortingStrategy,
} from '@dnd-kit/sortable'
import { useDashboardStore } from '@/store/dashboardStore'
import { PanelCard }         from './PanelCard'

interface Props { dashboardId: string }

export default function DashboardGrid({ dashboardId }: Props) {
  const panels       = useDashboardStore((s) => s.getActivePanels())
  const reorderPanels = useDashboardStore((s) => s.reorderPanels)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const ids      = panels.map((p) => p.id)
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    const next     = [...ids]
    next.splice(oldIndex, 1)
    next.splice(newIndex, 0, String(active.id))
    reorderPanels(dashboardId, next)
  }

  if (panels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-sm">
        <p>No hay paneles en este dashboard.</p>
        <p className="mt-1">Arrastra un chart desde el panel lateral →</p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={panels.map((p) => p.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4 p-4">
          {panels.map((panel) => (
            <PanelCard
              key={panel.id}
              panel={panel}
              dashboardId={dashboardId}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

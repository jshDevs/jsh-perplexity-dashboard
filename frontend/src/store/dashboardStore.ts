/**
 * dashboardStore — estado global del Dashboard Builder.
 *
 * Persistencia:
 *   - localStorage para draft offline-first
 *   - Sincroniza con Redis vía /api/v1/dashboards (push/pull)
 *
 * Un dashboard es un array de DashboardItem (charts posicionados).
 * El orden del array define el orden visual (dnd-kit SortableContext).
 */
import { create }    from 'zustand'
import { persist }   from 'zustand/middleware'
import { nanoid }    from 'nanoid'
import type { RecommendedChart } from '@/inference/chartSelector'

export interface DashboardItem {
  id:         string           // único por item
  chartId:    string           // slug del tipo: 'bar', 'line', etc.
  title:      string
  datasetId:  string
  chart:      RecommendedChart
  pinned:     boolean
  size:       'sm' | 'md' | 'lg' | 'xl'  // grid span
  createdAt:  string
}

export interface DashboardConfig {
  id:         string
  name:       string
  items:      DashboardItem[]
  createdAt:  string
  updatedAt:  string
}

export interface DashboardState {
  dashboards:        DashboardConfig[]
  activeDashboardId: string | null

  // Actions
  createDashboard:   (name: string) => string
  renameDashboard:   (id: string, name: string) => void
  deleteDashboard:   (id: string) => void
  setActive:         (id: string) => void

  addItem:           (dashId: string, item: Omit<DashboardItem, 'id' | 'createdAt'>) => string
  removeItem:        (dashId: string, itemId: string) => void
  reorderItems:      (dashId: string, newOrder: string[]) => void
  renameItem:        (dashId: string, itemId: string, title: string) => void
  resizeItem:        (dashId: string, itemId: string, size: DashboardItem['size']) => void
  togglePin:         (dashId: string, itemId: string) => void
  updateItem:        (dashId: string, itemId: string, patch: Partial<DashboardItem>) => void

  // Selectores
  getActive:         () => DashboardConfig | null
  getItem:           (dashId: string, itemId: string) => DashboardItem | undefined
}

function now() { return new Date().toISOString() }

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      dashboards:        [],
      activeDashboardId: null,

      createDashboard: (name) => {
        const id = nanoid(10)
        set((s) => ({
          dashboards: [...s.dashboards, {
            id, name, items: [], createdAt: now(), updatedAt: now(),
          }],
          activeDashboardId: id,
        }))
        return id
      },

      renameDashboard: (id, name) => set((s) => ({
        dashboards: s.dashboards.map((d) =>
          d.id === id ? { ...d, name, updatedAt: now() } : d),
      })),

      deleteDashboard: (id) => set((s) => ({
        dashboards:        s.dashboards.filter((d) => d.id !== id),
        activeDashboardId: s.activeDashboardId === id ? null : s.activeDashboardId,
      })),

      setActive: (id) => set({ activeDashboardId: id }),

      addItem: (dashId, item) => {
        const id = nanoid(8)
        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === dashId
              ? { ...d, updatedAt: now(), items: [...d.items, { ...item, id, createdAt: now() }] }
              : d
          ),
        }))
        return id
      },

      removeItem: (dashId, itemId) => set((s) => ({
        dashboards: s.dashboards.map((d) =>
          d.id === dashId
            ? { ...d, updatedAt: now(), items: d.items.filter((i) => i.id !== itemId) }
            : d
        ),
      })),

      reorderItems: (dashId, newOrder) => set((s) => ({
        dashboards: s.dashboards.map((d) => {
          if (d.id !== dashId) return d
          const map = new Map(d.items.map((i) => [i.id, i]))
          return {
            ...d,
            updatedAt: now(),
            items: newOrder.map((id) => map.get(id)!).filter(Boolean),
          }
        }),
      })),

      renameItem: (dashId, itemId, title) => set((s) => ({
        dashboards: s.dashboards.map((d) =>
          d.id === dashId
            ? { ...d, updatedAt: now(), items: d.items.map((i) => i.id === itemId ? { ...i, title } : i) }
            : d
        ),
      })),

      resizeItem: (dashId, itemId, size) => set((s) => ({
        dashboards: s.dashboards.map((d) =>
          d.id === dashId
            ? { ...d, updatedAt: now(), items: d.items.map((i) => i.id === itemId ? { ...i, size } : i) }
            : d
        ),
      })),

      togglePin: (dashId, itemId) => set((s) => ({
        dashboards: s.dashboards.map((d) =>
          d.id === dashId
            ? { ...d, updatedAt: now(), items: d.items.map((i) => i.id === itemId ? { ...i, pinned: !i.pinned } : i) }
            : d
        ),
      })),

      updateItem: (dashId, itemId, patch) => set((s) => ({
        dashboards: s.dashboards.map((d) =>
          d.id === dashId
            ? { ...d, updatedAt: now(), items: d.items.map((i) => i.id === itemId ? { ...i, ...patch } : i) }
            : d
        ),
      })),

      getActive: () => {
        const { dashboards, activeDashboardId } = get()
        return dashboards.find((d) => d.id === activeDashboardId) ?? null
      },

      getItem: (dashId, itemId) => {
        const d = get().dashboards.find((d) => d.id === dashId)
        return d?.items.find((i) => i.id === itemId)
      },
    }),
    {
      name:    'jsh-dashboards-v1',
      version: 1,
    }
  )
)

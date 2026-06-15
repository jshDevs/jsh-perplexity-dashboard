/**
 * dashboardStore — estado del Dashboard Builder.
 *
 * Gestiona paneles (charts), su orden, tamaño, título y pin.
 * Persiste layout en localStorage (hidratación instantánea) y
 * sincroniza con /api/v1/dashboards en background.
 */
import { create }    from 'zustand'
import { persist }   from 'zustand/middleware'

export type PanelSize = '1x1' | '1x2' | '2x1' | '2x2' | '1x3' | '3x1'

export interface Panel {
  id:        string
  chartType: string          // 'bar' | 'line' | 'pie' | 'scatter' | ...
  datasetId: string
  title:     string
  size:      PanelSize
  pinned:    boolean
  order:     number
  config:    Record<string, unknown>  // opciones extra del chart
}

export interface DashboardConfig {
  id:      string
  name:    string
  panels:  Panel[]
}

export interface DashboardState {
  dashboards:        DashboardConfig[]
  activeDashboardId: string | null
  // Actions
  createDashboard:   (name: string) => string
  deleteDashboard:   (id: string) => void
  renameDashboard:   (id: string, name: string) => void
  setActive:         (id: string) => void
  addPanel:          (dashboardId: string, panel: Omit<Panel, 'order'>) => void
  removePanel:       (dashboardId: string, panelId: string) => void
  updatePanel:       (dashboardId: string, panelId: string, patch: Partial<Panel>) => void
  reorderPanels:     (dashboardId: string, orderedIds: string[]) => void
  pinPanel:          (dashboardId: string, panelId: string, pinned: boolean) => void
  // Selector
  getActivePanels:   () => Panel[]
}

function nanoid6(): string {
  return Math.random().toString(36).slice(2, 8)
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      dashboards:        [],
      activeDashboardId: null,

      createDashboard: (name) => {
        const id = nanoid6()
        set((s) => ({
          dashboards:        [...s.dashboards, { id, name, panels: [] }],
          activeDashboardId: id,
        }))
        return id
      },

      deleteDashboard: (id) => set((s) => ({
        dashboards:        s.dashboards.filter((d) => d.id !== id),
        activeDashboardId: s.activeDashboardId === id ? null : s.activeDashboardId,
      })),

      renameDashboard: (id, name) => set((s) => ({
        dashboards: s.dashboards.map((d) => d.id === id ? { ...d, name } : d),
      })),

      setActive: (id) => set({ activeDashboardId: id }),

      addPanel: (dashboardId, panel) => set((s) => ({
        dashboards: s.dashboards.map((d) => {
          if (d.id !== dashboardId) return d
          const order = d.panels.length
          return { ...d, panels: [...d.panels, { ...panel, order }] }
        }),
      })),

      removePanel: (dashboardId, panelId) => set((s) => ({
        dashboards: s.dashboards.map((d) => {
          if (d.id !== dashboardId) return d
          return { ...d, panels: d.panels.filter((p) => p.id !== panelId) }
        }),
      })),

      updatePanel: (dashboardId, panelId, patch) => set((s) => ({
        dashboards: s.dashboards.map((d) => {
          if (d.id !== dashboardId) return d
          return {
            ...d,
            panels: d.panels.map((p) => p.id === panelId ? { ...p, ...patch } : p),
          }
        }),
      })),

      reorderPanels: (dashboardId, orderedIds) => set((s) => ({
        dashboards: s.dashboards.map((d) => {
          if (d.id !== dashboardId) return d
          const map = new Map(d.panels.map((p) => [p.id, p]))
          const reordered = orderedIds
            .map((id, i) => map.has(id) ? { ...map.get(id)!, order: i } : null)
            .filter(Boolean) as Panel[]
          return { ...d, panels: reordered }
        }),
      })),

      pinPanel: (dashboardId, panelId, pinned) =>
        get().updatePanel(dashboardId, panelId, { pinned }),

      getActivePanels: () => {
        const { dashboards, activeDashboardId } = get()
        const d = dashboards.find((x) => x.id === activeDashboardId)
        if (!d) return []
        return [...d.panels].sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
          return a.order - b.order
        })
      },
    }),
    {
      name:    'jsh-dashboard-builder',
      version: 1,
    }
  )
)

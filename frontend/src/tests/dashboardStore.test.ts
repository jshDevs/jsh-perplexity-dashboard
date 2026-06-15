import { describe, it, expect, beforeEach } from 'vitest'
import { useDashboardStore } from '@/store/dashboardStore'
import type { Panel } from '@/store/dashboardStore'

const mockPanel = (overrides: Partial<Panel> = {}): Omit<Panel, 'order'> => ({
  id:        'p1',
  chartType: 'bar',
  datasetId: 'ds1',
  title:     'Ventas',
  size:      '1x1',
  pinned:    false,
  config:    {},
  ...overrides,
})

beforeEach(() => {
  useDashboardStore.setState({ dashboards: [], activeDashboardId: null })
})

describe('createDashboard / deleteDashboard', () => {
  it('crea dashboard y lo activa', () => {
    const id = useDashboardStore.getState().createDashboard('Mi Dashboard')
    expect(useDashboardStore.getState().dashboards).toHaveLength(1)
    expect(useDashboardStore.getState().activeDashboardId).toBe(id)
  })

  it('elimina dashboard correctamente', () => {
    const id = useDashboardStore.getState().createDashboard('Test')
    useDashboardStore.getState().deleteDashboard(id)
    expect(useDashboardStore.getState().dashboards).toHaveLength(0)
  })

  it('rename cambia el nombre', () => {
    const id = useDashboardStore.getState().createDashboard('Old')
    useDashboardStore.getState().renameDashboard(id, 'New')
    const d = useDashboardStore.getState().dashboards.find(x => x.id === id)
    expect(d?.name).toBe('New')
  })
})

describe('addPanel / removePanel / updatePanel', () => {
  let dashId: string
  beforeEach(() => {
    dashId = useDashboardStore.getState().createDashboard('D')
  })

  it('addPanel agrega panel con order correcto', () => {
    useDashboardStore.getState().addPanel(dashId, mockPanel())
    const panels = useDashboardStore.getState().dashboards[0].panels
    expect(panels).toHaveLength(1)
    expect(panels[0].order).toBe(0)
  })

  it('removePanel elimina por id', () => {
    useDashboardStore.getState().addPanel(dashId, mockPanel({ id: 'p1' }))
    useDashboardStore.getState().removePanel(dashId, 'p1')
    expect(useDashboardStore.getState().dashboards[0].panels).toHaveLength(0)
  })

  it('updatePanel aplica patch correctamente', () => {
    useDashboardStore.getState().addPanel(dashId, mockPanel({ id: 'p1' }))
    useDashboardStore.getState().updatePanel(dashId, 'p1', { title: 'Nuevo' })
    const p = useDashboardStore.getState().dashboards[0].panels[0]
    expect(p.title).toBe('Nuevo')
  })

  it('pinPanel cambia pinned', () => {
    useDashboardStore.getState().addPanel(dashId, mockPanel({ id: 'p1' }))
    useDashboardStore.getState().pinPanel(dashId, 'p1', true)
    const p = useDashboardStore.getState().dashboards[0].panels[0]
    expect(p.pinned).toBe(true)
  })
})

describe('reorderPanels / getActivePanels', () => {
  let dashId: string
  beforeEach(() => {
    dashId = useDashboardStore.getState().createDashboard('D')
    useDashboardStore.getState().addPanel(dashId, mockPanel({ id: 'p1', title: 'A' }))
    useDashboardStore.getState().addPanel(dashId, mockPanel({ id: 'p2', title: 'B' }))
    useDashboardStore.getState().addPanel(dashId, mockPanel({ id: 'p3', title: 'C' }))
  })

  it('reorderPanels reordena correctamente', () => {
    useDashboardStore.getState().reorderPanels(dashId, ['p3', 'p1', 'p2'])
    const panels = useDashboardStore.getState().dashboards[0].panels
    expect(panels.find(p => p.id === 'p3')!.order).toBe(0)
    expect(panels.find(p => p.id === 'p1')!.order).toBe(1)
  })

  it('getActivePanels ordena pinned primero', () => {
    useDashboardStore.getState().setActive(dashId)
    useDashboardStore.getState().pinPanel(dashId, 'p3', true)
    const active = useDashboardStore.getState().getActivePanels()
    expect(active[0].id).toBe('p3')
  })
})

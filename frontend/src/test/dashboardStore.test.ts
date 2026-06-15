import { describe, it, expect, beforeEach } from 'vitest'
import { useDashboardStore } from '@/store/dashboardStore'

// Reset store entre tests
beforeEach(() => {
  useDashboardStore.setState({ dashboards: [], activeDashboardId: null })
})

describe('dashboardStore — dashboard CRUD', () => {
  it('crea dashboard y lo activa', () => {
    const id = useDashboardStore.getState().createDashboard('Mi Dashboard')
    const state = useDashboardStore.getState()
    expect(state.dashboards).toHaveLength(1)
    expect(state.dashboards[0].name).toBe('Mi Dashboard')
    expect(state.activeDashboardId).toBe(id)
  })

  it('renombra dashboard', () => {
    const id = useDashboardStore.getState().createDashboard('Inicial')
    useDashboardStore.getState().renameDashboard(id, 'Renombrado')
    expect(useDashboardStore.getState().dashboards[0].name).toBe('Renombrado')
  })

  it('elimina dashboard y limpia activeDashboardId', () => {
    const id = useDashboardStore.getState().createDashboard('Para borrar')
    useDashboardStore.getState().deleteDashboard(id)
    expect(useDashboardStore.getState().dashboards).toHaveLength(0)
    expect(useDashboardStore.getState().activeDashboardId).toBeNull()
  })

  it('setActive cambia dashboard activo', () => {
    const id1 = useDashboardStore.getState().createDashboard('A')
    const id2 = useDashboardStore.getState().createDashboard('B')
    useDashboardStore.getState().setActive(id1)
    expect(useDashboardStore.getState().activeDashboardId).toBe(id1)
  })

  it('getActive retorna null sin activo', () => {
    expect(useDashboardStore.getState().getActive()).toBeNull()
  })
})

describe('dashboardStore — item CRUD', () => {
  const mockChart: any = { type: 'bar', confidence: 0.9, title: 'Ventas por zona' }

  function setupDash() {
    const id = useDashboardStore.getState().createDashboard('Test')
    return id
  }

  it('addItem agrega un item al dashboard', () => {
    const dashId = setupDash()
    useDashboardStore.getState().addItem(dashId, {
      chartId: 'bar', title: 'Bar', datasetId: 'ds1', chart: mockChart, pinned: false, size: 'md',
    })
    expect(useDashboardStore.getState().dashboards[0].items).toHaveLength(1)
  })

  it('removeItem elimina el item correcto', () => {
    const dashId = setupDash()
    const itemId = useDashboardStore.getState().addItem(dashId, {
      chartId: 'bar', title: 'Bar', datasetId: 'ds1', chart: mockChart, pinned: false, size: 'md',
    })
    useDashboardStore.getState().removeItem(dashId, itemId)
    expect(useDashboardStore.getState().dashboards[0].items).toHaveLength(0)
  })

  it('renameItem cambia el título', () => {
    const dashId = setupDash()
    const itemId = useDashboardStore.getState().addItem(dashId, {
      chartId: 'bar', title: 'Original', datasetId: 'ds1', chart: mockChart, pinned: false, size: 'md',
    })
    useDashboardStore.getState().renameItem(dashId, itemId, 'Nuevo título')
    const item = useDashboardStore.getState().getItem(dashId, itemId)
    expect(item?.title).toBe('Nuevo título')
  })

  it('resizeItem cambia el size', () => {
    const dashId = setupDash()
    const itemId = useDashboardStore.getState().addItem(dashId, {
      chartId: 'bar', title: 'Bar', datasetId: 'ds1', chart: mockChart, pinned: false, size: 'md',
    })
    useDashboardStore.getState().resizeItem(dashId, itemId, 'xl')
    expect(useDashboardStore.getState().getItem(dashId, itemId)?.size).toBe('xl')
  })

  it('togglePin cambia estado pinned', () => {
    const dashId = setupDash()
    const itemId = useDashboardStore.getState().addItem(dashId, {
      chartId: 'bar', title: 'Bar', datasetId: 'ds1', chart: mockChart, pinned: false, size: 'md',
    })
    useDashboardStore.getState().togglePin(dashId, itemId)
    expect(useDashboardStore.getState().getItem(dashId, itemId)?.pinned).toBe(true)
    useDashboardStore.getState().togglePin(dashId, itemId)
    expect(useDashboardStore.getState().getItem(dashId, itemId)?.pinned).toBe(false)
  })

  it('reorderItems cambia el orden correctamente', () => {
    const dashId = setupDash()
    const id1 = useDashboardStore.getState().addItem(dashId, { chartId: 'bar',  title: 'A', datasetId: 'ds1', chart: mockChart, pinned: false, size: 'md' })
    const id2 = useDashboardStore.getState().addItem(dashId, { chartId: 'line', title: 'B', datasetId: 'ds1', chart: mockChart, pinned: false, size: 'md' })
    const id3 = useDashboardStore.getState().addItem(dashId, { chartId: 'pie',  title: 'C', datasetId: 'ds1', chart: mockChart, pinned: false, size: 'md' })
    useDashboardStore.getState().reorderItems(dashId, [id3, id1, id2])
    const items = useDashboardStore.getState().dashboards[0].items
    expect(items[0].id).toBe(id3)
    expect(items[1].id).toBe(id1)
  })

  it('getItem retorna undefined para id inexistente', () => {
    const dashId = setupDash()
    expect(useDashboardStore.getState().getItem(dashId, 'nonexistent')).toBeUndefined()
  })
})

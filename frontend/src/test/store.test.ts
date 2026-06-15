import { describe, it, expect, beforeEach } from 'vitest'
import { useDashboardStore } from '@/store/dashboardStore'
import { act } from 'react'

describe('useDashboardStore', () => {
  beforeEach(() => {
    act(() => {
      useDashboardStore.getState().clearFilters()
    })
  })

  it('starts with empty filters', () => {
    expect(useDashboardStore.getState().filters).toHaveLength(0)
  })

  it('adds a filter', () => {
    act(() => {
      useDashboardStore.getState().addFilter({ field: 'category', operator: '=', value: 'Electronics' })
    })
    expect(useDashboardStore.getState().filters).toHaveLength(1)
  })

  it('replaces filter for the same field', () => {
    act(() => {
      useDashboardStore.getState().addFilter({ field: 'category', operator: '=', value: 'A' })
      useDashboardStore.getState().addFilter({ field: 'category', operator: '=', value: 'B' })
    })
    const filters = useDashboardStore.getState().filters
    expect(filters).toHaveLength(1)
    expect(filters[0].value).toBe('B')
  })

  it('removes a filter', () => {
    act(() => {
      useDashboardStore.getState().addFilter({ field: 'category', operator: '=', value: 'A' })
      useDashboardStore.getState().removeFilter('category')
    })
    expect(useDashboardStore.getState().filters).toHaveLength(0)
  })

  it('toggles off existing filter', () => {
    act(() => {
      useDashboardStore.getState().addFilter({ field: 'category', operator: '=', value: 'A' })
      useDashboardStore.getState().toggleFilter({ field: 'category', operator: '=', value: 'A' })
    })
    expect(useDashboardStore.getState().filters).toHaveLength(0)
  })

  it('getActiveFilters includes time range', () => {
    act(() => {
      useDashboardStore.getState().setTimeRange({ from: '2024-01-01', to: '2024-12-31' })
    })
    const active = useDashboardStore.getState().getActiveFilters()
    expect(active.some((f) => f.field === 'order_date')).toBe(true)
  })

  it('clearFilters resets everything', () => {
    act(() => {
      useDashboardStore.getState().addFilter({ field: 'region', operator: '=', value: 'Norte' })
      useDashboardStore.getState().setTimeRange({ from: '2024-01-01', to: '2024-12-31' })
      useDashboardStore.getState().clearFilters()
    })
    expect(useDashboardStore.getState().filters).toHaveLength(0)
    expect(useDashboardStore.getState().timeRange).toBeNull()
  })

  it('sets granularity', () => {
    act(() => {
      useDashboardStore.getState().setGranularity('month')
    })
    expect(useDashboardStore.getState().granularity).toBe('month')
  })
})

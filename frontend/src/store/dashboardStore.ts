import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { QueryFilter } from '@/types/dashboard'

interface FilterState {
  filters:    QueryFilter[]
  timeRange:  { from: string; to: string } | null
  granularity: 'day' | 'week' | 'month'
  setFilters:      (filters: QueryFilter[]) => void
  addFilter:       (filter: QueryFilter)   => void
  removeFilter:    (field: string)         => void
  toggleFilter:    (filter: QueryFilter)   => void
  setTimeRange:    (range: { from: string; to: string } | null) => void
  setGranularity:  (g: 'day' | 'week' | 'month') => void
  clearFilters:    () => void
  getActiveFilters: () => QueryFilter[]
}

export const useDashboardStore = create<FilterState>()(
  subscribeWithSelector((set, get) => ({
    filters:     [],
    timeRange:   null,
    granularity: 'day',

    setFilters: (filters) => set({ filters }),

    addFilter: (filter) =>
      set((state) => ({
        filters: [
          ...state.filters.filter((f) => f.field !== filter.field),
          filter,
        ],
      })),

    removeFilter: (field) =>
      set((state) => ({
        filters: state.filters.filter((f) => f.field !== field),
      })),

    toggleFilter: (filter) => {
      const existing = get().filters.find(
        (f) => f.field === filter.field && f.value === filter.value
      )
      if (existing) {
        get().removeFilter(filter.field)
      } else {
        get().addFilter(filter)
      }
    },

    setTimeRange: (range) => set({ timeRange: range }),
    setGranularity: (granularity) => set({ granularity }),
    clearFilters: () => set({ filters: [], timeRange: null }),

    getActiveFilters: () => {
      const { filters, timeRange } = get()
      const all: QueryFilter[] = [...filters]
      if (timeRange) {
        all.push({ field: 'order_date', operator: '>=', value: timeRange.from })
        all.push({ field: 'order_date', operator: '<=', value: timeRange.to })
      }
      return all
    },
  }))
)

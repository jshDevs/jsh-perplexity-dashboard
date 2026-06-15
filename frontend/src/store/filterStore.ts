/**
 * filterStore — estado global de filtros cross-dashboard.
 *
 * Usa Zustand con subscribeWithSelector para que cada chart
 * solo re-renderice cuando cambian sus propios filtros activos.
 *
 * Estructura de un filtro:
 *   { field, values[], source: chartId }
 *
 * Cross-filtering:
 *   Chart A selecciona "zona=Norte" → store.setFilter('zona', ['Norte'], 'chartA')
 *   Chart B y C leen store.getFilteredRows(rows) → solo Norte
 *   Chart A NO se filtra a sí mismo (source === chartId → skip)
 */
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export interface ActiveFilter {
  field:   string
  values:  (string | number | boolean)[]
  source:  string   // chartId que originó el filtro
}

export interface FilterState {
  filters:     ActiveFilter[]
  // Actions
  setFilter:   (field: string, values: (string|number|boolean)[], source: string) => void
  clearFilter: (field: string) => void
  clearAll:    () => void
  // Selector: filas filtradas excluyendo el source chart
  getFilteredRows: (
    rows:     Record<string, unknown>[],
    selfId:   string,
  ) => Record<string, unknown>[]
  // Utilidad: filtros activos para un chart (excluye su propio)
  getActiveFiltersFor: (selfId: string) => ActiveFilter[]
}

export const useFilterStore = create<FilterState>()(
  subscribeWithSelector((set, get) => ({
    filters: [],

    setFilter: (field, values, source) => set((s) => {
      const others  = s.filters.filter((f) => f.field !== field)
      if (values.length === 0) return { filters: others }
      return { filters: [...others, { field, values, source }] }
    }),

    clearFilter: (field) => set((s) => ({
      filters: s.filters.filter((f) => f.field !== field),
    })),

    clearAll: () => set({ filters: [] }),

    getFilteredRows: (rows, selfId) => {
      const filters = get().filters.filter((f) => f.source !== selfId)
      if (filters.length === 0) return rows
      return rows.filter((row) =>
        filters.every((f) => {
          const val = row[f.field]
          return f.values.includes(val as string | number | boolean)
        })
      )
    },

    getActiveFiltersFor: (selfId) =>
      get().filters.filter((f) => f.source !== selfId),
  }))
)

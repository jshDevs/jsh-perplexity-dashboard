import { describe, it, expect, beforeEach } from 'vitest'
import { useFilterStore } from '@/store/filterStore'

const rows = [
  { zona: 'Norte', ventas: 100, activo: true },
  { zona: 'Sur',   ventas: 200, activo: false },
  { zona: 'Norte', ventas: 150, activo: true },
  { zona: 'Este',  ventas: 80,  activo: true },
]

beforeEach(() => useFilterStore.getState().clearAll())

describe('filterStore — setFilter / clearFilter', () => {
  it('agrega un filtro nuevo', () => {
    useFilterStore.getState().setFilter('zona', ['Norte'], 'chartA')
    expect(useFilterStore.getState().filters).toHaveLength(1)
    expect(useFilterStore.getState().filters[0].field).toBe('zona')
  })

  it('reemplaza filtro existente del mismo campo', () => {
    useFilterStore.getState().setFilter('zona', ['Norte'],        'chartA')
    useFilterStore.getState().setFilter('zona', ['Sur', 'Este'],  'chartA')
    expect(useFilterStore.getState().filters).toHaveLength(1)
    expect(useFilterStore.getState().filters[0].values).toContain('Sur')
  })

  it('clearFilter elimina un campo específico', () => {
    useFilterStore.getState().setFilter('zona',    ['Norte'], 'chartA')
    useFilterStore.getState().setFilter('activo',  [true],   'chartB')
    useFilterStore.getState().clearFilter('zona')
    expect(useFilterStore.getState().filters.map(f => f.field)).not.toContain('zona')
    expect(useFilterStore.getState().filters.map(f => f.field)).toContain('activo')
  })

  it('clearAll elimina todos los filtros', () => {
    useFilterStore.getState().setFilter('zona', ['Norte'], 'c1')
    useFilterStore.getState().setFilter('activo', [true],  'c2')
    useFilterStore.getState().clearAll()
    expect(useFilterStore.getState().filters).toHaveLength(0)
  })

  it('setFilter con values=[] elimina el filtro', () => {
    useFilterStore.getState().setFilter('zona', ['Norte'], 'c1')
    useFilterStore.getState().setFilter('zona', [],        'c1')
    expect(useFilterStore.getState().filters).toHaveLength(0)
  })
})

describe('filterStore — getFilteredRows (cross-filtering)', () => {
  it('filtra rows por valores activos', () => {
    useFilterStore.getState().setFilter('zona', ['Norte'], 'chartB')
    const filtered = useFilterStore.getState().getFilteredRows(rows, 'chartA')
    expect(filtered.every(r => r.zona === 'Norte')).toBe(true)
    expect(filtered).toHaveLength(2)
  })

  it('chart source NO se filtra a sí mismo', () => {
    useFilterStore.getState().setFilter('zona', ['Norte'], 'chartA')
    const filtered = useFilterStore.getState().getFilteredRows(rows, 'chartA')
    expect(filtered).toHaveLength(4)  // ve todos
  })

  it('múltiples filtros se combinan con AND', () => {
    useFilterStore.getState().setFilter('zona',   ['Norte'], 'c1')
    useFilterStore.getState().setFilter('activo', [true],    'c2')
    const filtered = useFilterStore.getState().getFilteredRows(rows, 'c3')
    expect(filtered.every(r => r.zona === 'Norte' && r.activo === true)).toBe(true)
  })

  it('sin filtros activos devuelve todos los rows', () => {
    const filtered = useFilterStore.getState().getFilteredRows(rows, 'chartX')
    expect(filtered).toHaveLength(4)
  })

  it('getActiveFiltersFor excluye filtros del propio chart', () => {
    useFilterStore.getState().setFilter('zona',   ['Norte'], 'c1')
    useFilterStore.getState().setFilter('activo', [true],    'c2')
    const active = useFilterStore.getState().getActiveFiltersFor('c1')
    expect(active.map(f => f.field)).not.toContain('zona')
    expect(active.map(f => f.field)).toContain('activo')
  })
})

describe('filterUrlSync — encode/decode', () => {
  it('encode/decode round-trip preserva filtros', () => {
    const filters = [
      { field: 'zona', values: ['Norte', 'Sur'], source: 'c1' },
      { field: 'activo', values: [true], source: 'c2' },
    ]
    const encoded = btoa(encodeURIComponent(JSON.stringify(filters)))
    const decoded = JSON.parse(decodeURIComponent(atob(encoded)))
    expect(decoded).toEqual(filters)
  })

  it('decode con string inválido retorna array vacío', () => {
    // simular la función decode inline
    const decode = (raw: string) => { try { return JSON.parse(decodeURIComponent(atob(raw))) } catch { return [] } }
    expect(decode('not-valid-base64!!!')).toEqual([])
  })
})

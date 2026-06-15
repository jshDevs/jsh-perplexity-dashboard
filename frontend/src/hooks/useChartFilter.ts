/**
 * useChartFilter — hook que conecta eventos de ECharts
 * (brush, legend select, dataZoom, click) al filterStore.
 *
 * Uso en DynamicChart:
 *   const { onEvents, filteredRows } = useChartFilter(chartId, field, rows)
 *   <ReactECharts onEvents={onEvents} />
 *
 * Eventos soportados:
 *   brushSelected  → selección por drag en scatter/bar
 *   legendselectchanged → toggle de series
 *   click          → clic en barra/segmento pie
 */
import { useCallback, useMemo } from 'react'
import { useFilterStore }       from '@/store/filterStore'

interface UseChartFilterOpts {
  chartId:      string
  dimensionField?: string          // campo que se filtrará al hacer click
  rows:         Record<string, unknown>[]
}

export function useChartFilter({ chartId, dimensionField, rows }: UseChartFilterOpts) {
  const setFilter    = useFilterStore((s) => s.setFilter)
  const clearFilter  = useFilterStore((s) => s.clearFilter)
  const getFilteredRows    = useFilterStore((s) => s.getFilteredRows)
  const getActiveFiltersFor = useFilterStore((s) => s.getActiveFiltersFor)

  // Rows filtradas por otros charts (excluye propio)
  const filteredRows = useMemo(
    () => getFilteredRows(rows, chartId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, chartId, useFilterStore.getState().filters],
  )

  const activeFilters = getActiveFiltersFor(chartId)

  // Handler clic en barra/segmento → filtra por dimensionField
  const onClick = useCallback((params: any) => {
    if (!dimensionField) return
    const value = params?.name ?? params?.data?.name ?? params?.value
    if (value === undefined || value === null) return
    setFilter(dimensionField, [value], chartId)
  }, [chartId, dimensionField, setFilter])

  // Handler brush (selección rectángular en scatter)
  const onBrushSelected = useCallback((params: any) => {
    if (!dimensionField) return
    const selected: (string|number|boolean)[] = []
    params?.batch?.[0]?.selected?.forEach((s: any) => {
      s.dataIndex?.forEach((idx: number) => {
        const val = rows[idx]?.[dimensionField]
        if (val !== undefined) selected.push(val as string|number|boolean)
      })
    })
    if (selected.length > 0) setFilter(dimensionField, selected, chartId)
    else clearFilter(dimensionField)
  }, [chartId, dimensionField, rows, setFilter, clearFilter])

  // Handler legend toggle → filtra series activas
  const onLegendSelectChanged = useCallback((params: any) => {
    if (!dimensionField) return
    const active = Object.entries(params?.selected ?? {})
      .filter(([, v]) => v)
      .map(([k]) => k)
    if (active.length === 0) clearFilter(dimensionField)
    else setFilter(dimensionField, active, chartId)
  }, [chartId, dimensionField, setFilter, clearFilter])

  const onEvents = {
    click:                onClick,
    brushSelected:        onBrushSelected,
    legendselectchanged:  onLegendSelectChanged,
  }

  return { filteredRows, activeFilters, onEvents }
}

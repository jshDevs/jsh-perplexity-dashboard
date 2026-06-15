/**
 * ChoroplethMap — ECharts 5 geo choropleth for El Salvador
 * Uses the GeoJSON layers from jshDevs/dashboard/maps/sv/
 * Supports drill-down: departamentos → municipios → distritos
 */
import ReactECharts from 'echarts-for-react'
import * as echarts  from 'echarts/core'
import { useEffect, useState, useMemo } from 'react'
import type { EChartsOption } from 'echarts'

type GeoLevel = 'departamentos' | 'municipios' | 'distritos'

interface MapDataPoint {
  name:       string
  value:      number
  rate_100k?: number
}

interface ChoroplethMapProps {
  data:          MapDataPoint[]
  level?:        GeoLevel
  showRate?:     boolean
  height?:       string
  onDrillDown?:  (name: string, nextLevel: GeoLevel) => void
}

const LEVEL_NEXT: Record<GeoLevel, GeoLevel | null> = {
  departamentos: 'municipios',
  municipios:    'distritos',
  distritos:     null,
}

export default function ChoroplethMap({
  data,
  level     = 'departamentos',
  showRate  = false,
  height    = '420px',
  onDrillDown,
}: ChoroplethMapProps) {
  const [geoLoaded, setGeoLoaded] = useState(false)

  useEffect(() => {
    // GeoJSON served from backend /maps/sv/{level}.json
    fetch(`/api/v1/maps/sv/${level}.json`)
      .then((r) => r.json())
      .then((geo) => {
        echarts.registerMap(`sv_${level}`, geo)
        setGeoLoaded(true)
      })
      .catch((e) => console.error('[ChoroplethMap] GeoJSON load failed:', e))
  }, [level])

  const displayData = useMemo(
    () => data.map((d) => ({ name: d.name, value: showRate && d.rate_100k != null ? d.rate_100k : d.value })),
    [data, showRate]
  )

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger:   'item',
      formatter: (p: { name: string; value: number }) =>
        `<b>${p.name}</b><br/>${showRate ? 'Tasa /100k' : 'Incidentes'}: ${p.value?.toLocaleString('es-SV') ?? 'N/A'}`,
    },
    visualMap: {
      min:        0,
      max:        Math.max(...displayData.map((d) => d.value ?? 0), 1),
      left:       'right',
      top:        'middle',
      calculable: true,
      inRange:    { color: ['#1e293b', '#4f46e5', '#6366f1', '#818cf8', '#c7d2fe'] },
      textStyle:  { color: '#94a3b8' },
    },
    series: [{
      type:      'map',
      map:       geoLoaded ? `sv_${level}` : '',
      roam:      true,
      data:      displayData,
      label:     { show: level === 'departamentos', color: '#f1f5f9', fontSize: 10 },
      emphasis:  { label: { show: true }, itemStyle: { areaColor: '#6366f1' } },
      itemStyle: { borderColor: '#334155', borderWidth: 0.5 },
      select:    { disabled: !onDrillDown },
    }],
  }

  const nextLevel = LEVEL_NEXT[level]

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-300">
            Mapa: {level.charAt(0).toUpperCase() + level.slice(1)}
          </h3>
          {showRate && (
            <span className="text-xs bg-cyan-900 text-cyan-300 border border-cyan-700 px-2 py-0.5 rounded-full">Tasa /100k</span>
          )}
        </div>
        {nextLevel && onDrillDown && (
          <span className="text-xs text-slate-500">Haz clic en una unidad para ver {nextLevel}</span>
        )}
      </div>

      {!geoLoaded ? (
        <div className="flex justify-center items-center" style={{ height }}>
          <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <ReactECharts
          option={option}
          style={{ height }}
          opts={{ renderer: 'canvas' }}
          onEvents={nextLevel && onDrillDown ? {
            click: (p: { name: string }) => onDrillDown(p.name, nextLevel),
          } : {}}
          notMerge
        />
      )}
    </div>
  )
}

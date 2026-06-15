import { lazy } from 'react'
import { resolveChartDescriptor } from './registry'
import type { LogicalChartType } from './registry'

const EChartsAdapter = lazy(() => import('./adapters/EChartsAdapter'))
const PlotlyAdapter  = lazy(() => import('./adapters/PlotlyAdapter'))
const NivoAdapter    = lazy(() => import('./adapters/NivoAdapter'))

export function resolveChartComponent(type: LogicalChartType) {
  const descriptor = resolveChartDescriptor(type)
  switch (descriptor.engine) {
    case 'plotly': return PlotlyAdapter
    case 'nivo':   return NivoAdapter
    default:       return EChartsAdapter
  }
}

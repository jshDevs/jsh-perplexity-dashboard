import { Suspense } from 'react'
import { resolveChartComponent } from './resolveComponent'
import type { UnifiedChartProps } from './types'

export default function ChartRenderer(props: UnifiedChartProps) {
  const Component = resolveChartComponent(props.chartType)

  return (
    <Suspense fallback={<div className="h-[380px] rounded-xl bg-slate-800 animate-pulse" />}>
      <Component {...props} />
    </Suspense>
  )
}

import { describe, it, expect } from 'vitest'
import { CHART_REGISTRY, resolveChartDescriptor } from '@/charts/registry'

describe('CHART_REGISTRY', () => {
  it('resolves bar to echarts', () => {
    expect(resolveChartDescriptor('bar').engine).toBe('echarts')
  })

  it('resolves violin to plotly', () => {
    expect(resolveChartDescriptor('violin').engine).toBe('plotly')
  })

  it('resolves waffle to nivo', () => {
    expect(resolveChartDescriptor('waffle').engine).toBe('nivo')
  })

  it('3D charts advertise supports3d', () => {
    expect(CHART_REGISTRY.bar3d.capabilities.supports3d).toBe(true)
    expect(CHART_REGISTRY.scatter3d.capabilities.supports3d).toBe(true)
  })

  it('sankey disables cross-filter by default', () => {
    expect(CHART_REGISTRY.sankey.capabilities.supportsCrossFilter).toBe(false)
  })
})

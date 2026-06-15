export type LogicalChartType =
  | 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'scatter' | 'heatmap'
  | 'treemap' | 'sankey' | 'radar' | 'graph' | 'candlestick'
  | 'map' | 'bar3d' | 'scatter3d' | 'surface'
  | 'violin' | 'splom' | 'ternary'
  | 'waffle' | 'chord'

export type ChartEngine = 'echarts' | 'plotly' | 'nivo'

export interface ChartCapabilities {
  supportsCrossFilter: boolean
  supportsTheme:       boolean
  supportsExportPng:   boolean
  supportsLargeData:   boolean
  supports3d:          boolean
}

export interface ChartDescriptor {
  engine: ChartEngine
  lazyModule: string
  capabilities: ChartCapabilities
}

export const CHART_REGISTRY: Record<LogicalChartType, ChartDescriptor> = {
  bar:         { engine: 'echarts', lazyModule: './adapters/EChartsAdapter', capabilities: { supportsCrossFilter: true, supportsTheme: true, supportsExportPng: true, supportsLargeData: true,  supports3d: false } },
  line:        { engine: 'echarts', lazyModule: './adapters/EChartsAdapter', capabilities: { supportsCrossFilter: true, supportsTheme: true, supportsExportPng: true, supportsLargeData: true,  supports3d: false } },
  area:        { engine: 'echarts', lazyModule: './adapters/EChartsAdapter', capabilities: { supportsCrossFilter: true, supportsTheme: true, supportsExportPng: true, supportsLargeData: true,  supports3d: false } },
  pie:         { engine: 'echarts', lazyModule: './adapters/EChartsAdapter', capabilities: { supportsCrossFilter: true, supportsTheme: true, supportsExportPng: true, supportsLargeData: false, supports3d: false } },
  donut:       { engine: 'echarts', lazyModule: './adapters/EChartsAdapter', capabilities: { supportsCrossFilter: true, supportsTheme: true, supportsExportPng: true, supportsLargeData: false, supports3d: false } },
  scatter:     { engine: 'echarts', lazyModule: './adapters/EChartsAdapter', capabilities: { supportsCrossFilter: true, supportsTheme: true, supportsExportPng: true, supportsLargeData: true,  supports3d: false } },
  heatmap:     { engine: 'echarts', lazyModule: './adapters/EChartsAdapter', capabilities: { supportsCrossFilter: true, supportsTheme: true, supportsExportPng: true, supportsLargeData: true,  supports3d: false } },
  treemap:     { engine: 'echarts', lazyModule: './adapters/EChartsAdapter', capabilities: { supportsCrossFilter: true, supportsTheme: true, supportsExportPng: true, supportsLargeData: true,  supports3d: false } },
  sankey:      { engine: 'echarts', lazyModule: './adapters/EChartsAdapter', capabilities: { supportsCrossFilter: false, supportsTheme: true, supportsExportPng: true, supportsLargeData: false, supports3d: false } },
  radar:       { engine: 'echarts', lazyModule: './adapters/EChartsAdapter', capabilities: { supportsCrossFilter: true, supportsTheme: true, supportsExportPng: true, supportsLargeData: false, supports3d: false } },
  graph:       { engine: 'echarts', lazyModule: './adapters/EChartsAdapter', capabilities: { supportsCrossFilter: false, supportsTheme: true, supportsExportPng: true, supportsLargeData: true,  supports3d: false } },
  candlestick: { engine: 'echarts', lazyModule: './adapters/EChartsAdapter', capabilities: { supportsCrossFilter: true, supportsTheme: true, supportsExportPng: true, supportsLargeData: true,  supports3d: false } },
  map:         { engine: 'echarts', lazyModule: './adapters/EChartsAdapter', capabilities: { supportsCrossFilter: true, supportsTheme: true, supportsExportPng: true, supportsLargeData: true,  supports3d: false } },
  bar3d:       { engine: 'echarts', lazyModule: './adapters/EChartsAdapter', capabilities: { supportsCrossFilter: false, supportsTheme: true, supportsExportPng: true, supportsLargeData: true,  supports3d: true  } },
  scatter3d:   { engine: 'echarts', lazyModule: './adapters/EChartsAdapter', capabilities: { supportsCrossFilter: false, supportsTheme: true, supportsExportPng: true, supportsLargeData: true,  supports3d: true  } },
  surface:     { engine: 'echarts', lazyModule: './adapters/EChartsAdapter', capabilities: { supportsCrossFilter: false, supportsTheme: true, supportsExportPng: true, supportsLargeData: false, supports3d: true  } },
  violin:      { engine: 'plotly',  lazyModule: './adapters/PlotlyAdapter',  capabilities: { supportsCrossFilter: false, supportsTheme: true, supportsExportPng: true, supportsLargeData: false, supports3d: false } },
  splom:       { engine: 'plotly',  lazyModule: './adapters/PlotlyAdapter',  capabilities: { supportsCrossFilter: false, supportsTheme: true, supportsExportPng: true, supportsLargeData: false, supports3d: false } },
  ternary:     { engine: 'plotly',  lazyModule: './adapters/PlotlyAdapter',  capabilities: { supportsCrossFilter: false, supportsTheme: true, supportsExportPng: true, supportsLargeData: false, supports3d: true  } },
  waffle:      { engine: 'nivo',    lazyModule: './adapters/NivoAdapter',    capabilities: { supportsCrossFilter: false, supportsTheme: true, supportsExportPng: false, supportsLargeData: false, supports3d: false } },
  chord:       { engine: 'nivo',    lazyModule: './adapters/NivoAdapter',    capabilities: { supportsCrossFilter: false, supportsTheme: true, supportsExportPng: false, supportsLargeData: false, supports3d: false } },
}

export function resolveChartDescriptor(type: LogicalChartType): ChartDescriptor {
  return CHART_REGISTRY[type]
}

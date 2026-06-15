# Multi-engine chart architecture

## Objetivo

Extender el sistema para soportar múltiples motores de visualización sin romper:
- selección automática de chart type
- cross-filtering
- theme global
- exportación
- offline-first

## Motores

| Engine | Uso principal |
|--------|---------------|
| ECharts | default general-purpose charts |
| ECharts-GL | 3D / WebGL extension |
| Plotly | violin / SPLOM / ternary |
| Nivo | waffle / chord |

## Flujo

1. El motor de inferencia decide `chartType` lógico.
2. `CHART_REGISTRY` resuelve el engine.
3. `ChartRenderer` lazy-load el adapter correcto.
4. El adapter renderiza con props unificadas.

## Ventajas

- bundle inicial pequeño
- expansión incremental
- desacople entre inferencia y render
- posibilidad de feature flags por tipo

## Próximo paso

- Integrar `ChartRenderer` dentro de `DynamicChart.tsx`
- Agregar `echarts-gl`, `react-plotly.js`, `plotly.js-dist-min`, `@nivo/waffle`, `@nivo/chord`
- Añadir visual regression Playwright por chart type

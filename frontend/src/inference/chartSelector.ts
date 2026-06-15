/**
 * chartSelector — árbol de decisión determinista (sin LLM) que
 * mapea InferredSchema → RecommendedChart[].
 *
 * Reglas de prioridad (waterfall):
 *   1. TIME + METRIC → line / area / candlestick
 *   2. DIMENSION + METRIC (1 dim, 1 metric) → bar
 *   3. DIMENSION + METRIC (1 dim, N metrics) → radar
 *   4. METRIC + METRIC (2 campos) → scatter
 *   5. DIMENSION sola (≤8 valores únicos) → pie / donut
 *   6. METRIC × METRIC heatmap (con DIMENSION extra) → heatmap
 *   7. Muchos campos numéricos (≥4) → splom (Plotly)
 *   8. Solo DIMENSION (dos) → chord (Nivo)
 *   9. BOOLEAN + METRIC → waffle (Nivo)
 *  10. Fallback → bar
 */
import type { InferredSchema, RecommendedChart } from './types'

function title(parts: string[]): string {
  return parts.join(' por ')
}

export function selectCharts(schema: InferredSchema): RecommendedChart[] {
  const { metrics, dimensions, timeFields, fields } = schema
  const M = metrics.length
  const D = dimensions.length
  const T = timeFields.length
  const recommendations: RecommendedChart[] = []

  // ── Regla 1: Serie temporal ──────────────────────────────────────────────
  if (T >= 1 && M >= 1) {
    const tField = timeFields[0]
    const mField = metrics[0]
    const points = schema.rowCount

    if (M === 1) {
      recommendations.push({
        type:       'line',
        confidence: 0.92,
        reason:     `${tField.name} es TIME + ${mField.name} es METRIC → serie temporal`,
        x_key:      tField.name,
        y_key:      mField.name,
        title:      title([mField.name, tField.name]),
      })
      recommendations.push({
        type:       'area',
        confidence: 0.80,
        reason:     'Variante area de la serie temporal',
        x_key:      tField.name,
        y_key:      mField.name,
        title:      title([mField.name, tField.name]),
      })
    }

    // OHLC → candlestick si hay 4 métricas con nombres open/high/low/close
    const ohlcNames = ['open','high','low','close']
    const hasOHLC   = ohlcNames.every((n) => fields.some((f) => f.name.toLowerCase().includes(n)))
    if (hasOHLC) {
      recommendations.push({
        type:       'candlestick',
        confidence: 0.95,
        reason:     'Detectados campos open/high/low/close → OHLC candlestick',
        x_key:      tField.name,
        title:      'Precio OHLC',
      })
    }
  }

  // ── Regla 2: Dimension + 1 Metric → bar ──────────────────────────────────
  if (D >= 1 && M >= 1 && T === 0) {
    const dim = dimensions[0]
    const met = metrics[0]
    recommendations.push({
      type:          'bar',
      confidence:    0.88,
      reason:        `${dim.name} es DIMENSION + ${met.name} es METRIC`,
      x_key:         dim.name,
      y_key:         met.name,
      category_key:  dim.name,
      title:         title([met.name, dim.name]),
    })

    // Alternativa pie si pocas categorías
    if (dim.uniqueCount <= 8) {
      recommendations.push({
        type:          dim.uniqueCount <= 5 ? 'donut' : 'pie',
        confidence:    0.75,
        reason:        `${dim.name} tiene ${dim.uniqueCount} categorías ≤ 8 → pie/donut`,
        category_key:  dim.name,
        y_key:         met.name,
        title:         title([met.name, dim.name]),
      })
    }
  }

  // ── Regla 3: Dimension + N Metrics (≥3) → radar ──────────────────────────
  if (D >= 1 && M >= 3 && T === 0) {
    const dim = dimensions[0]
    recommendations.push({
      type:          'radar',
      confidence:    0.72,
      reason:        `${M} métricas sobre ${dim.name} → radar comparativo`,
      category_key:  dim.name,
      title:         `Radar de ${dim.name}`,
    })
  }

  // ── Regla 4: 2 Metrics sin Dimension ni Time → scatter ───────────────────
  if (M >= 2 && D === 0 && T === 0) {
    recommendations.push({
      type:       'scatter',
      confidence: 0.85,
      reason:     `2 métricas sin dimensión → scatter (correlación)`,
      x_key:      metrics[0].name,
      y_key:      metrics[1].name,
      title:      `${metrics[0].name} vs ${metrics[1].name}`,
    })
  }

  // ── Regla 5: Solo DIMENSION (2 dims) → chord ─────────────────────────────
  if (D >= 2 && M === 0 && T === 0) {
    recommendations.push({
      type:          'chord',
      confidence:    0.68,
      reason:        '2 dimensiones sin métrica → relaciones chord (Nivo)',
      category_key:  dimensions[0].name,
      title:         `Relaciones ${dimensions[0].name} ↔ ${dimensions[1].name}`,
    })
  }

  // ── Regla 6: METRIC × DIMENSION → heatmap ───────────────────────────────
  if (M >= 1 && D >= 2 && T === 0) {
    recommendations.push({
      type:          'heatmap',
      confidence:    0.70,
      reason:        `2 dimensiones + 1 métrica → heatmap de densidad`,
      x_key:         dimensions[0].name,
      y_key:         dimensions[1].name,
      category_key:  metrics[0].name,
      title:         `Heatmap ${dimensions[0].name} × ${dimensions[1].name}`,
    })
  }

  // ── Regla 7: ≥4 métricas numéricas → splom (Plotly) ─────────────────────
  if (M >= 4) {
    recommendations.push({
      type:       'splom',
      confidence: 0.65,
      reason:     `${M} campos numéricos → SPLOM scatter matrix (Plotly)`,
      title:      'Scatter Plot Matrix',
    })
  }

  // ── Regla 8: BOOLEAN + METRIC → waffle (Nivo) ───────────────────────────
  const boolFields = fields.filter((f) => f.role === 'BOOLEAN')
  if (boolFields.length >= 1 && M >= 1) {
    recommendations.push({
      type:          'waffle',
      confidence:    0.70,
      reason:        `Campo booleano ${boolFields[0].name} + métrica → waffle (Nivo)`,
      category_key:  boolFields[0].name,
      y_key:         metrics[0].name,
      title:         `Distribución ${boolFields[0].name}`,
    })
  }

  // ── Fallback ─────────────────────────────────────────────────────────────
  if (recommendations.length === 0) {
    const first = fields[0]
    const second = fields.find((f) => f !== first)
    recommendations.push({
      type:       'bar',
      confidence: 0.40,
      reason:     'Fallback: sin métricas/dimensiones claras → bar genérico',
      x_key:      first?.name,
      y_key:      second?.name,
      title:      'Vista general',
    })
  }

  // Ordenar por confianza descendente
  return recommendations.sort((a, b) => b.confidence - a.confidence)
}

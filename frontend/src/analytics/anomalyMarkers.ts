/**
 * anomalyMarkers — convierte AnomalyResult[] en opciones ECharts:
 *   markPoint (pin rojo/naranja) en el punto anómalo
 *   markLine (líneas punteadas de límite IQR)
 *
 * forecastSeries — convierte ForecastResult en series ECharts:
 *   serie discontinua (dashed) para proyección
 *   banda de confianza 95% (areaStyle)
 */
import type { AnomalyResult } from './anomaly'
import type { ForecastResult } from './forecast'

const SEVERITY_COLOR: Record<string, string> = {
  high:   '#ef4444',
  medium: '#f97316',
  low:    '#eab308',
}

export function buildAnomalyMarkPoints(anomalies: AnomalyResult[], labels?: string[]) {
  return {
    symbol: 'pin',
    symbolSize: 32,
    data: anomalies.map((a) => ({
      coord:      [labels ? labels[a.index] : a.index, a.value],
      itemStyle:  { color: SEVERITY_COLOR[a.severity] },
      label:      { show: true, formatter: a.severity === 'high' ? '⚠' : '▲', fontSize: 12 },
      tooltip:    { formatter: `Anomalía ${a.severity}<br/>Valor: ${a.value.toFixed(2)}<br/>Método: ${a.method}` },
    })),
  }
}

export function buildAnomalyMarkLines(anomalies: AnomalyResult[]) {
  const iqrAnomalies = anomalies.filter((a) => a.method === 'iqr' && a.upper !== undefined)
  if (iqrAnomalies.length === 0) return null

  const first = iqrAnomalies[0]
  return {
    silent: true,
    lineStyle: { type: 'dashed', color: '#ef4444', opacity: 0.5 },
    data: [
      [{ yAxis: first.upper!, name: 'Límite superior' }, { yAxis: first.upper! }],
      [{ yAxis: first.lower!, name: 'Límite inferior' }, { yAxis: first.lower! }],
    ],
  }
}

export function buildForecastSeries(
  result:     ForecastResult,
  labels?:    string[],
  seriesName: string = 'Forecast',
): any[] {
  const historical = result.points.filter((p) => !p.isForcast)
  const forecast   = result.points.filter((p) =>  p.isForcast)

  if (forecast.length === 0) return []

  // Serie principal proyectada (dashed)
  const forecastSerie = {
    name:      `${seriesName} (proyección)`,
    type:      'line',
    data:      [
      // Punto de enganche: último histórico
      [labels ? labels[historical.at(-1)!.index] : historical.at(-1)!.index, historical.at(-1)!.value],
      ...forecast.map((p) => [
        labels ? labels[p.index] ?? `+${p.index - historical.length + 1}` : p.index,
        p.value,
      ]),
    ],
    lineStyle: { type: 'dashed', color: '#818cf8', width: 2 },
    itemStyle: { color: '#818cf8' },
    symbol:    'emptyCircle',
  }

  // Banda de confianza 95%
  const hasCI = forecast.some((p) => p.lower95 !== undefined)
  if (!hasCI) return [forecastSerie]

  const upperBand = {
    name:      '__ci_upper',
    type:      'line',
    data:      forecast.map((p) => [
      labels ? labels[p.index] ?? `+${p.index - historical.length + 1}` : p.index,
      p.upper95 ?? p.value,
    ]),
    lineStyle: { opacity: 0 },
    areaStyle: { color: '#818cf8', opacity: 0.12 },
    stack:     '__ci',
    symbol:    'none',
    silent:    true,
    legendHoverLink: false,
  }

  const lowerBand = {
    name:      '__ci_lower',
    type:      'line',
    data:      forecast.map((p) => [
      labels ? labels[p.index] ?? `+${p.index - historical.length + 1}` : p.index,
      p.lower95 ?? p.value,
    ]),
    lineStyle: { opacity: 0 },
    areaStyle: { color: '#1e1b4b', opacity: 0.8 },
    stack:     '__ci',
    symbol:    'none',
    silent:    true,
    legendHoverLink: false,
  }

  return [lowerBand, upperBand, forecastSerie]
}

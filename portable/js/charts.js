/**
 * charts.js — Generación automática de charts con Apache ECharts.
 * Selección de tipo basada en los tipos inferidos del schema.
 * Requiere que window.echarts esté disponible (vendor local).
 */

import { state } from './state.js'

/** Mapa de instancias ECharts activas { containerId → instance } */
const _instances = {}

/**
 * Genera todos los charts para el dataset actual.
 * Retorna un array de { id, title, type } para montar en el grid.
 */
export function buildCharts(dataset) {
  const { schema, rows } = dataset
  const charts = []

  const metrics    = schema.filter(s => s.type === 'METRIC')
  const dimensions = schema.filter(s => s.type === 'DIMENSION')
  const times      = schema.filter(s => s.type === 'TIME')

  // Chart 1: Serie temporal si hay TIME + METRIC
  if (times.length && metrics.length) {
    charts.push(buildLineChart(rows, times[0].field, metrics[0].field))
  }

  // Chart 2: Barras por DIMENSION + METRIC principal
  if (dimensions.length && metrics.length) {
    charts.push(buildBarChart(rows, dimensions[0].field, metrics[0].field))
  }

  // Chart 3: Pie/Donut si hay DIMENSION con cardinalidad ≤ 10
  const lowCardDim = dimensions.find(d => {
    const uniq = new Set(rows.map(r => r[d.field])).size
    return uniq >= 2 && uniq <= 10
  })
  if (lowCardDim && metrics.length) {
    charts.push(buildPieChart(rows, lowCardDim.field, metrics[0].field))
  }

  // Chart 4: Si hay múltiples métricas, mostrar comparativa de barras
  if (metrics.length >= 2 && dimensions.length) {
    charts.push(buildMultiBarChart(rows, dimensions[0].field, metrics.slice(0, 3)))
  }

  // Fallback: si no se generó nada, una barra simple con los primeros campos
  if (charts.length === 0 && schema.length >= 2) {
    charts.push(buildBarChart(rows, schema[0].field, schema[1].field))
  }

  return charts
}

/** Renderiza una instancia de ECharts en el contenedor dado */
export function renderChart(containerId, chartDef) {
  if (!window.echarts) {
    console.warn('ECharts no disponible. Verifica assets/vendor/echarts.min.js')
    return
  }
  // Destruir instancia previa si existe
  if (_instances[containerId]) {
    _instances[containerId].dispose()
  }
  const dom = document.getElementById(containerId)
  if (!dom) return

  const chart = window.echarts.init(dom, 'dark')
  chart.setOption(chartDef.option)
  _instances[containerId] = chart

  // Responsive
  const ro = new ResizeObserver(() => chart.resize())
  ro.observe(dom)
}

/** Destruye todas las instancias */
export function disposeAll() {
  Object.values(_instances).forEach(c => c.dispose())
  Object.keys(_instances).forEach(k => delete _instances[k])
}

// ── Builders ──────────────────────────────────────────────

function buildLineChart(rows, xField, yField) {
  const sorted = [...rows].sort((a, b) => String(a[xField]).localeCompare(String(b[xField])))
  return {
    id:    `line_${xField}_${yField}`,
    title: `${yField} por ${xField}`,
    type:  'line',
    option: {
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, top: 30, bottom: 60 },
      xAxis: {
        type: 'category',
        data: sorted.map(r => r[xField]),
        axisLabel: { rotate: 30, fontSize: 10 },
      },
      yAxis: { type: 'value' },
      series: [{
        name: yField,
        type: 'line',
        data: sorted.map(r => r[yField]),
        smooth: true,
        areaStyle: { opacity: 0.15 },
        lineStyle: { width: 2 },
      }],
    },
  }
}

function buildBarChart(rows, catField, valField) {
  // Agrupar y sumar por categoría
  const agg = aggregateSum(rows, catField, valField)
  const sorted = Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 20)
  return {
    id:    `bar_${catField}_${valField}`,
    title: `${valField} por ${catField}`,
    type:  'bar',
    option: {
      tooltip: { trigger: 'axis' },
      grid: { left: 60, right: 20, top: 30, bottom: 80 },
      xAxis: {
        type: 'category',
        data: sorted.map(([k]) => String(k).slice(0, 20)),
        axisLabel: { rotate: 35, fontSize: 10 },
      },
      yAxis: { type: 'value' },
      series: [{
        name: valField,
        type: 'bar',
        data: sorted.map(([, v]) => Number(v).toFixed(2)),
        barMaxWidth: 40,
      }],
    },
  }
}

function buildPieChart(rows, catField, valField) {
  const agg = aggregateSum(rows, catField, valField)
  return {
    id:    `pie_${catField}_${valField}`,
    title: `Distribución de ${valField}`,
    type:  'pie',
    option: {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', left: 'left', textStyle: { fontSize: 11 } },
      series: [{
        name: valField,
        type: 'pie',
        radius: ['35%', '65%'],
        data: Object.entries(agg).map(([name, value]) => ({ name, value: Number(value).toFixed(2) })),
        label: { fontSize: 10 },
      }],
    },
  }
}

function buildMultiBarChart(rows, catField, metricFields) {
  const cats = [...new Set(rows.map(r => r[catField]))].slice(0, 20)
  const series = metricFields.map(m => ({
    name:     m.field,
    type:     'bar',
    data:     cats.map(c => {
      const filtered = rows.filter(r => r[catField] === c)
      return filtered.reduce((s, r) => s + (Number(r[m.field]) || 0), 0).toFixed(2)
    }),
    barMaxWidth: 30,
  }))
  return {
    id:    `multi_${catField}`,
    title: `Comparativa por ${catField}`,
    type:  'multi-bar',
    option: {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { top: 4, textStyle: { fontSize: 11 } },
      grid: { left: 60, right: 20, top: 36, bottom: 80 },
      xAxis: {
        type: 'category',
        data: cats.map(c => String(c).slice(0, 20)),
        axisLabel: { rotate: 35, fontSize: 10 },
      },
      yAxis: { type: 'value' },
      series,
    },
  }
}

/** Suma de valField agrupada por catField */
function aggregateSum(rows, catField, valField) {
  return rows.reduce((acc, row) => {
    const k = row[catField] ?? '(vacío)'
    acc[k] = (acc[k] || 0) + (Number(row[valField]) || 0)
    return acc
  }, {})
}

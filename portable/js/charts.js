/**
 * charts.js v2 — Generación automática + manual de charts con Apache ECharts.
 * Fase Local 2: agrega buildChartFromConfig (para el builder drag-drop)
 * y soporte scatter. Requiere window.echarts (vendor local).
 */

import { state } from './state.js'

const _instances = {}

// ─── API pública ───────────────────────────────────────────────────────────────

export function buildCharts(dataset) {
  const { schema, rows } = dataset
  const charts     = []
  const metrics    = schema.filter(s => s.type === 'METRIC')
  const dimensions = schema.filter(s => s.type === 'DIMENSION')
  const times      = schema.filter(s => s.type === 'TIME')

  if (times.length && metrics.length)
    charts.push(buildLineChart(rows, times[0].field, metrics[0].field))

  if (dimensions.length && metrics.length)
    charts.push(buildBarChart(rows, dimensions[0].field, metrics[0].field))

  const lowCardDim = dimensions.find(d => {
    const u = new Set(rows.map(r => r[d.field])).size
    return u >= 2 && u <= 10
  })
  if (lowCardDim && metrics.length)
    charts.push(buildPieChart(rows, lowCardDim.field, metrics[0].field))

  if (metrics.length >= 2 && dimensions.length)
    charts.push(buildMultiBarChart(rows, dimensions[0].field, metrics.slice(0, 3)))

  if (charts.length === 0 && schema.length >= 2)
    charts.push(buildBarChart(rows, schema[0].field, schema[1].field))

  return charts
}

/**
 * Construye un chart desde la configuración del builder drag-drop.
 * @param {{ type, xField, yField, group, rows }} cfg
 */
export function buildChartFromConfig({ type, xField, yField, group, rows }) {
  const autoType = type === 'auto' ? _guessType(rows, xField, yField) : type
  switch (autoType) {
    case 'line':    return buildLineChart(rows, xField, yField)
    case 'pie':     return buildPieChart(rows, xField, yField)
    case 'scatter': return buildScatterChart(rows, xField, yField)
    case 'bar':
    default:
      return group
        ? buildGroupedBarChart(rows, xField, yField, group)
        : buildBarChart(rows, xField, yField)
  }
}

export function renderChart(containerId, chartDef) {
  if (!window.echarts) {
    console.warn('ECharts no disponible. Verifica assets/vendor/echarts.min.js')
    return
  }
  if (_instances[containerId]) _instances[containerId].dispose()
  const dom = document.getElementById(containerId)
  if (!dom) return
  const chart = window.echarts.init(dom, 'dark')
  chart.setOption(chartDef.option)
  _instances[containerId] = chart
  const ro = new ResizeObserver(() => chart.resize())
  ro.observe(dom)
}

export function disposeAll() {
  Object.values(_instances).forEach(c => c.dispose())
  Object.keys(_instances).forEach(k => delete _instances[k])
}

// ─── Builders internos ─────────────────────────────────────────────────────────

function buildLineChart(rows, xField, yField) {
  const sorted = [...rows].sort((a, b) => String(a[xField]).localeCompare(String(b[xField])))
  return {
    id: `line_${xField}_${yField}`, title: `${yField} por ${xField}`, type: 'line',
    option: {
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, top: 30, bottom: 60 },
      xAxis: { type: 'category', data: sorted.map(r => r[xField]), axisLabel: { rotate: 30, fontSize: 10 } },
      yAxis: { type: 'value' },
      series: [{ name: yField, type: 'line', data: sorted.map(r => r[yField]), smooth: true, areaStyle: { opacity: 0.15 }, lineStyle: { width: 2 } }],
    },
  }
}

function buildBarChart(rows, catField, valField) {
  const agg    = aggregateSum(rows, catField, valField)
  const sorted = Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 20)
  return {
    id: `bar_${catField}_${valField}`, title: `${valField} por ${catField}`, type: 'bar',
    option: {
      tooltip: { trigger: 'axis' },
      grid: { left: 60, right: 20, top: 30, bottom: 80 },
      xAxis: { type: 'category', data: sorted.map(([k]) => String(k).slice(0, 20)), axisLabel: { rotate: 35, fontSize: 10 } },
      yAxis: { type: 'value' },
      series: [{ name: valField, type: 'bar', data: sorted.map(([, v]) => +v.toFixed(2)), barMaxWidth: 40 }],
    },
  }
}

function buildPieChart(rows, catField, valField) {
  const agg = aggregateSum(rows, catField, valField)
  return {
    id: `pie_${catField}_${valField}`, title: `Distribución de ${valField}`, type: 'pie',
    option: {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', left: 'left', textStyle: { fontSize: 11 } },
      series: [{ name: valField, type: 'pie', radius: ['35%','65%'], data: Object.entries(agg).map(([name, value]) => ({ name, value: +value.toFixed(2) })), label: { fontSize: 10 } }],
    },
  }
}

function buildMultiBarChart(rows, catField, metricFields) {
  const cats   = [...new Set(rows.map(r => r[catField]))].slice(0, 20)
  const series = metricFields.map(m => ({
    name: m.field, type: 'bar',
    data: cats.map(c => rows.filter(r => r[catField] === c).reduce((s, r) => s + (Number(r[m.field]) || 0), 0).toFixed(2)),
    barMaxWidth: 30,
  }))
  return {
    id: `multi_${catField}`, title: `Comparativa por ${catField}`, type: 'multi-bar',
    option: {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { top: 4, textStyle: { fontSize: 11 } },
      grid: { left: 60, right: 20, top: 36, bottom: 80 },
      xAxis: { type: 'category', data: cats.map(c => String(c).slice(0, 20)), axisLabel: { rotate: 35, fontSize: 10 } },
      yAxis: { type: 'value' },
      series,
    },
  }
}

function buildScatterChart(rows, xField, yField) {
  const data = rows
    .filter(r => typeof r[xField] === 'number' && typeof r[yField] === 'number')
    .map(r => [r[xField], r[yField]])
  return {
    id: `scatter_${xField}_${yField}`, title: `${xField} vs ${yField}`, type: 'scatter',
    option: {
      tooltip: { trigger: 'item', formatter: p => `${xField}: ${p.value[0]}<br>${yField}: ${p.value[1]}` },
      grid: { left: 60, right: 20, top: 30, bottom: 60 },
      xAxis: { type: 'value', name: xField, nameLocation: 'middle', nameGap: 30 },
      yAxis: { type: 'value', name: yField },
      series: [{ type: 'scatter', data, symbolSize: 6, itemStyle: { opacity: 0.7 } }],
    },
  }
}

function buildGroupedBarChart(rows, catField, valField, groupField) {
  const cats   = [...new Set(rows.map(r => r[catField]))].slice(0, 20)
  const groups = [...new Set(rows.map(r => r[groupField]))].slice(0, 8)
  const series = groups.map(g => ({
    name: String(g), type: 'bar',
    data: cats.map(c => {
      const filtered = rows.filter(r => r[catField] === c && r[groupField] === g)
      return filtered.reduce((s, r) => s + (Number(r[valField]) || 0), 0).toFixed(2)
    }),
    barMaxWidth: 28,
  }))
  return {
    id: `gbar_${catField}_${valField}_${groupField}`, title: `${valField} por ${catField} agrupado por ${groupField}`, type: 'grouped-bar',
    option: {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { top: 4, textStyle: { fontSize: 11 } },
      grid: { left: 60, right: 20, top: 36, bottom: 80 },
      xAxis: { type: 'category', data: cats.map(c => String(c).slice(0, 18)), axisLabel: { rotate: 35, fontSize: 10 } },
      yAxis: { type: 'value' },
      series,
    },
  }
}

function _guessType(rows, xField, yField) {
  const xSample = rows.slice(0, 10).map(r => r[xField])
  const isXDate = xSample.some(v => /\d{4}[-/]\d{2}/.test(String(v)))
  const uniqX   = new Set(rows.map(r => r[xField])).size
  if (isXDate)          return 'line'
  if (uniqX <= 10)      return 'pie'
  return 'bar'
}

function aggregateSum(rows, catField, valField) {
  return rows.reduce((acc, row) => {
    const k = row[catField] ?? '(vacío)'
    acc[k]  = (acc[k] || 0) + (Number(row[valField]) || 0)
    return acc
  }, {})
}

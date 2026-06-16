/**
 * app.js — Orquestador principal de JSH Dashboard Portable.
 * Conecta: ingest → infer-schema → charts → table → state → storage
 */

import { state, setState, subscribe, uid } from './state.js'
import { saveDashboards, loadDashboards, saveLastDataset, loadLastDataset, saveTheme, loadTheme, clearAll } from './storage.js'
import { readFile }    from './ingest.js'
import { inferSchema } from './infer-schema.js'
import { buildCharts, renderChart, disposeAll } from './charts.js'
import { initTable, loadTable } from './table.js'

// ── DOM refs ─────────────────────────────────────────────
const $ = id => document.getElementById(id)

const fileInput       = $('fileInput')
const dropZone        = $('dropZone')
const dropLabel       = $('dropLabel')
const ingestStatus    = $('ingestStatus')
const schemaSection   = $('schemaSection')
const schemaList      = $('schemaList')
const dashboardList   = $('dashboardList')
const newDashBtn      = $('newDashBtn')
const dashTitle       = $('dashTitle')
const chartGrid       = $('chartGrid')
const tableSection    = $('tableSection')
const emptyState      = $('emptyState')
const exportCsvBtn    = $('exportCsvBtn')
const exportPngBtn    = $('exportPngBtn')
const themeToggle     = $('themeToggle')
const clearStorageBtn = $('clearStorageBtn')
const sidebarToggle   = $('sidebarToggle')
const sidebar         = $('sidebar')

// ── Init ─────────────────────────────────────────────────
function init() {
  // Cargar tema
  const theme = loadTheme()
  setState('theme', theme)
  document.body.className = theme
  themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️'

  // Cargar dashboards guardados
  const saved = loadDashboards()
  setState('dashboards', saved.length ? saved : [{ id: uid(), name: 'Dashboard 1', charts: [] }])
  renderDashboardList()

  // Seleccionar primero
  if (state.dashboards.length) {
    setState('activeDash', state.dashboards[0].id)
  }

  // Cargar último dataset si existe
  const lastDs = loadLastDataset()
  if (lastDs) {
    setState('dataset', lastDs)
    onDatasetReady(lastDs)
  }

  // Inicializar tabla
  initTable()

  // Bind eventos
  bindEvents()
}

// ── Eventos ───────────────────────────────────────────────
function bindEvents() {
  // File input
  fileInput.addEventListener('change', e => handleFile(e.target.files[0]))

  // Drag & drop
  dropZone.addEventListener('click', () => fileInput.click())
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over') })
  dropZone.addEventListener('dragleave',  () => dropZone.classList.remove('drag-over'))
  dropZone.addEventListener('drop', e => {
    e.preventDefault()
    dropZone.classList.remove('drag-over')
    handleFile(e.dataTransfer.files[0])
  })

  // Nuevo dashboard
  newDashBtn.addEventListener('click', () => {
    const name = prompt('Nombre del dashboard:', `Dashboard ${state.dashboards.length + 1}`)
    if (!name?.trim()) return
    const dash = { id: uid(), name: name.trim(), charts: [] }
    const updated = [...state.dashboards, dash]
    setState('dashboards', updated)
    saveDashboards(updated)
    setState('activeDash', dash.id)
    renderDashboardList()
    renderActiveDashboard()
  })

  // Tema
  themeToggle.addEventListener('click', () => {
    const t = state.theme === 'dark' ? 'light' : 'dark'
    setState('theme', t)
    document.body.className = t
    themeToggle.textContent = t === 'dark' ? '🌙' : '☀️'
    saveTheme(t)
  })

  // Limpiar storage
  clearStorageBtn.addEventListener('click', () => {
    if (!confirm('¿Eliminar todos los datos locales?')) return
    clearAll()
    location.reload()
  })

  // Sidebar toggle
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed')
  })

  // Export CSV
  exportCsvBtn.addEventListener('click', exportCSV)

  // Export PNG (primer chart)
  exportPngBtn.addEventListener('click', exportPNG)
}

// ── Ingest ────────────────────────────────────────────────
async function handleFile(file) {
  if (!file) return
  setStatus('busy', `⏳ Leyendo ${file.name}…`)
  dropLabel.textContent = `📄 ${file.name}`

  try {
    const rows   = await readFile(file)
    const schema = inferSchema(rows)
    const dataset = { name: file.name, rows, schema }

    setState('dataset', dataset)
    saveLastDataset(dataset)
    setStatus('ok', `✓ ${rows.length.toLocaleString()} filas · ${schema.length} columnas`)
    onDatasetReady(dataset)
  } catch (err) {
    setStatus('err', `✗ ${err.message}`)
    dropLabel.textContent = '📂 CSV · JSON'
  }
}

function onDatasetReady(dataset) {
  // Schema
  renderSchema(dataset.schema)

  // Charts
  disposeAll()
  const chartDefs = buildCharts(dataset)

  // Guardar charts en el dashboard activo
  const updated = state.dashboards.map(d =>
    d.id === state.activeDash ? { ...d, charts: chartDefs } : d
  )
  setState('dashboards', updated)
  saveDashboards(updated)

  renderActiveDashboard()

  // Tabla
  loadTable(dataset.rows)
  tableSection.hidden = false
  emptyState.hidden   = true
  exportCsvBtn.hidden = false
  exportPngBtn.hidden = false
}

// ── Render ────────────────────────────────────────────────
function renderSchema(schema) {
  schemaSection.hidden = false
  schemaList.innerHTML = ''
  schema.forEach(({ field, type, sample }) => {
    const li = document.createElement('li')
    li.innerHTML = `
      <span class="badge badge-${type}">${type}</span>
      <span title="${sample}">${field}</span>
    `
    schemaList.appendChild(li)
  })
}

function renderDashboardList() {
  dashboardList.innerHTML = ''
  state.dashboards.forEach(dash => {
    const li = document.createElement('li')
    li.className = dash.id === state.activeDash ? 'active' : ''
    li.innerHTML = `
      <span class="dash-name">${dash.name}</span>
      <span class="dash-del" title="Eliminar" data-id="${dash.id}">✕</span>
    `
    li.querySelector('.dash-name').addEventListener('click', () => {
      setState('activeDash', dash.id)
      renderDashboardList()
      renderActiveDashboard()
    })
    li.querySelector('.dash-del').addEventListener('click', e => {
      e.stopPropagation()
      deleteDashboard(dash.id)
    })
    dashboardList.appendChild(li)
  })
}

function renderActiveDashboard() {
  const dash = state.dashboards.find(d => d.id === state.activeDash)
  if (!dash) { dashTitle.textContent = 'Sin dashboard'; return }

  dashTitle.textContent = dash.name

  if (!dash.charts?.length) {
    chartGrid.hidden = true
    emptyState.hidden = !!(state.dataset)
    return
  }

  chartGrid.hidden  = false
  emptyState.hidden = true
  chartGrid.innerHTML = ''

  dash.charts.forEach(chart => {
    const card = document.createElement('div')
    card.className = 'chart-card'
    card.innerHTML = `
      <div class="chart-card-header">
        <span class="chart-card-title">${chart.title}</span>
      </div>
      <div class="chart-canvas" id="c_${chart.id}"></div>
    `
    chartGrid.appendChild(card)
    // Pequeño delay para que el DOM esté montado
    requestAnimationFrame(() => renderChart(`c_${chart.id}`, chart))
  })
}

function deleteDashboard(id) {
  if (state.dashboards.length === 1) {
    alert('Debes tener al menos un dashboard.')
    return
  }
  const updated = state.dashboards.filter(d => d.id !== id)
  setState('dashboards', updated)
  saveDashboards(updated)
  if (state.activeDash === id) {
    setState('activeDash', updated[0].id)
  }
  renderDashboardList()
  renderActiveDashboard()
}

// ── Export ────────────────────────────────────────────────
function exportCSV() {
  if (!state.dataset) return
  const { rows, name } = state.dataset
  if (!rows.length) return
  const cols = Object.keys(rows[0])
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [
    cols.join(','),
    ...rows.map(r => cols.map(c => escape(r[c])).join(','))
  ]
  download(lines.join('\n'), name.replace(/\.[^.]+$/, '') + '_export.csv', 'text/csv')
}

function exportPNG() {
  // Exportar el primer canvas de ECharts disponible
  const firstCanvas = chartGrid.querySelector('canvas')
  if (!firstCanvas) return
  const url = firstCanvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = (state.dataset?.name ?? 'chart').replace(/\.[^.]+$/, '') + '.png'
  a.click()
}

function download(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Helpers ───────────────────────────────────────────────
function setStatus(type, msg) {
  ingestStatus.textContent = msg
  ingestStatus.className   = `status-msg ${type}`
}

// ── Arrancar ──────────────────────────────────────────────
init()

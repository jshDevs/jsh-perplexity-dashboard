/**
 * app.js v2 — Orquestador principal JSH Dashboard Portable.
 * Fase Local 2: agrega IndexedDB, builder drag-drop, stats panel,
 * anomaly detection, dataset switcher, relaciones detectadas.
 */

import { state, setState, subscribe, uid } from './state.js'
import { saveDashboards, loadDashboards, saveLastDataset, loadLastDataset, saveTheme, loadTheme, clearAll } from './storage.js'
import { readFile }        from './ingest.js'
import { inferSchema }     from './infer-schema.js'
import { buildCharts, renderChart, disposeAll } from './charts.js'
import { initTable, loadTable } from './table.js'
import { idbSave, idbLoad, idbList, idbDelete } from './idb.js'
import { detectRelations } from './relations.js'
import { analyzeAnomalies } from './anomaly.js'
import { computeStats }    from './stats.js'
import { mountBuilder, unmountBuilder } from './builder.js'

const $ = id => document.getElementById(id)

// ─── DOM refs ──────────────────────────────────────────────────────────────────
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

// ─── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  // Tema
  const theme = loadTheme()
  setState('theme', theme)
  document.body.className = theme
  themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️'

  // Dashboards
  const saved = loadDashboards()
  setState('dashboards', saved.length ? saved : [{ id: uid(), name: 'Dashboard 1', charts: [] }])
  setState('activeDash', state.dashboards[0].id)
  renderDashboardList()

  // Ultimo dataset desde localStorage (rápido)
  const lastDs = loadLastDataset()
  if (lastDs) {
    setState('dataset', lastDs)
    onDatasetReady(lastDs, false)
  }

  // Inyectar secciones dinámicas en sidebar y main
  _injectDatasetSwitcher()
  _injectBuilderToggle()
  _injectStatsPanel()
  _injectAnomalyPanel()
  _injectRelationsPanel()

  initTable()
  bindEvents()
}

// ─── Eventos ───────────────────────────────────────────────────────────────────
function bindEvents() {
  fileInput.addEventListener('change', e => handleFile(e.target.files[0]))
  dropZone.addEventListener('click',   () => fileInput.click())
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over') })
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'))
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over')
    handleFile(e.dataTransfer.files[0])
  })

  newDashBtn.addEventListener('click', () => {
    const name = prompt('Nombre del dashboard:', `Dashboard ${state.dashboards.length + 1}`)
    if (!name?.trim()) return
    const dash    = { id: uid(), name: name.trim(), charts: [] }
    const updated = [...state.dashboards, dash]
    setState('dashboards', updated)
    saveDashboards(updated)
    setState('activeDash', dash.id)
    renderDashboardList()
    renderActiveDashboard()
  })

  themeToggle.addEventListener('click', () => {
    const t = state.theme === 'dark' ? 'light' : 'dark'
    setState('theme', t)
    document.body.className = t
    themeToggle.textContent = t === 'dark' ? '🌙' : '☀️'
    saveTheme(t)
  })

  clearStorageBtn.addEventListener('click', () => {
    if (!confirm('¿Eliminar todos los datos locales?')) return
    clearAll()
    location.reload()
  })

  sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'))
  exportCsvBtn.addEventListener('click', exportCSV)
  exportPngBtn.addEventListener('click', exportPNG)
}

// ─── Ingest ────────────────────────────────────────────────────────────────────
async function handleFile(file) {
  if (!file) return
  setStatus('busy', `⏳ Leyendo ${file.name}…`)
  dropLabel.textContent = `📄 ${file.name}`
  try {
    const rows    = await readFile(file)
    const schema  = inferSchema(rows)
    const dataset = { name: file.name, rows, schema }
    setState('dataset', dataset)
    // Guardar completo en IndexedDB, preview en localStorage
    await idbSave(dataset)
    saveLastDataset(dataset)
    setStatus('ok', `✓ ${rows.length.toLocaleString()} filas · ${schema.length} cols`)
    onDatasetReady(dataset, true)
    refreshDatasetSwitcher()
  } catch (err) {
    setStatus('err', `✗ ${err.message}`)
    dropLabel.textContent = '📂 CSV · JSON'
  }
}

function onDatasetReady(dataset, regenerateCharts = true) {
  renderSchema(dataset.schema)

  if (regenerateCharts) {
    disposeAll()
    const chartDefs = buildCharts(dataset)
    const updated   = state.dashboards.map(d =>
      d.id === state.activeDash ? { ...d, charts: chartDefs } : d
    )
    setState('dashboards', updated)
    saveDashboards(updated)
  }

  renderActiveDashboard()
  loadTable(dataset.rows)
  tableSection.hidden = false
  emptyState.hidden   = true
  exportCsvBtn.hidden = false
  exportPngBtn.hidden = false

  // Stats, anomalías, relaciones
  renderStats(dataset)
  renderAnomalies(dataset)
  renderRelations(dataset)

  // Builder disponible
  const builderSection = $('builderSection')
  if (builderSection) builderSection.hidden = false
}

// ─── Dataset switcher (IndexedDB) ──────────────────────────────────────────────
function _injectDatasetSwitcher() {
  const sec = document.createElement('section')
  sec.className = 'sidebar-section'
  sec.id = 'datasetSwitcherSection'
  sec.innerHTML = `
    <h3>Datasets guardados</h3>
    <ul id="datasetList" class="dash-list"></ul>
  `
  sidebar.insertBefore(sec, sidebar.querySelector('.sidebar-footer'))
  refreshDatasetSwitcher()
}

async function refreshDatasetSwitcher() {
  const list = $('datasetList')
  if (!list) return
  const all = await idbList()
  list.innerHTML = ''
  if (!all.length) {
    list.innerHTML = '<li style="color:var(--text2);font-size:12px">Sin datasets</li>'
    return
  }
  all.sort((a, b) => b.savedAt - a.savedAt).forEach(ds => {
    const li = document.createElement('li')
    li.innerHTML = `
      <span class="dash-name" title="${ds.name}">${ds.name.slice(0, 22)}</span>
      <span class="dash-del" title="Eliminar" data-name="${ds.name}">✕</span>
    `
    li.querySelector('.dash-name').addEventListener('click', async () => {
      const full = await idbLoad(ds.name)
      if (!full) return
      setState('dataset', full)
      saveLastDataset(full)
      dropLabel.textContent = `📄 ${full.name}`
      setStatus('ok', `✓ ${full.rows.length.toLocaleString()} filas cargadas`)
      onDatasetReady(full, true)
    })
    li.querySelector('.dash-del').addEventListener('click', async e => {
      e.stopPropagation()
      await idbDelete(ds.name)
      refreshDatasetSwitcher()
    })
    list.appendChild(li)
  })
}

// ─── Builder toggle ────────────────────────────────────────────────────────────
function _injectBuilderToggle() {
  // Botón en topbar
  const btn = document.createElement('button')
  btn.id        = 'builderToggleBtn'
  btn.className = 'btn-sm'
  btn.textContent = '⚙ Builder'
  btn.hidden    = true
  $('topbar').querySelector('.topbar-actions').prepend(btn)

  // Sección builder debajo del chartGrid
  const sec = document.createElement('section')
  sec.id       = 'builderSection'
  sec.hidden   = true
  sec.style.cssText = 'padding:16px;border-top:1px solid var(--border)'
  sec.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <h3 style="font-size:13px;font-weight:600">⚙ Chart Builder</h3>
      <button id="builderCloseBtn" class="btn-icon">✕</button>
    </div>
    <div id="builderMount"></div>
  `
  $('main').appendChild(sec)

  btn.addEventListener('click', () => {
    const sec = $('builderSection')
    sec.hidden = !sec.hidden
    if (!sec.hidden) mountBuilder('builderMount', chartDef => {
      renderActiveDashboard()
    })
    else unmountBuilder('builderMount')
  })

  sec.querySelector('#builderCloseBtn').addEventListener('click', () => {
    sec.hidden = true
    unmountBuilder('builderMount')
  })

  // Mostrar botón cuando haya dataset
  subscribe('dataset', () => { btn.hidden = false })
}

// ─── Stats panel ───────────────────────────────────────────────────────────────
function _injectStatsPanel() {
  const sec = document.createElement('section')
  sec.id        = 'statsSection'
  sec.hidden    = true
  sec.style.cssText = 'padding:16px;border-top:1px solid var(--border)'
  sec.innerHTML = `
    <details>
      <summary style="cursor:pointer;font-size:13px;font-weight:600;padding:4px 0">📊 Estadísticas descriptivas</summary>
      <div id="statsContent" style="margin-top:10px"></div>
    </details>
  `
  $('main').appendChild(sec)
}

function renderStats(dataset) {
  const sec = $('statsSection')
  if (!sec) return
  sec.hidden = false
  const stats   = computeStats(dataset.rows, dataset.schema)
  const content = $('statsContent')
  const metrics = Object.entries(stats).filter(([, s]) => s.type === 'METRIC')
  if (!metrics.length) { content.innerHTML = '<p style="color:var(--text2)">Sin columnas METRIC</p>'; return }

  content.innerHTML = `
    <div style="overflow-x:auto">
    <table style="width:100%;font-size:11px">
      <thead><tr>
        <th>Campo</th><th>Count</th><th>Min</th><th>Max</th>
        <th>Mean</th><th>Median</th><th>Std</th><th>Sum</th><th>Nulls</th>
      </tr></thead>
      <tbody>
        ${metrics.map(([f, s]) => `<tr>
          <td><b>${f}</b></td>
          <td>${s.count}</td>
          <td>${s.min}</td>
          <td>${s.max}</td>
          <td>${s.mean}</td>
          <td>${s.median}</td>
          <td>${s.std}</td>
          <td>${s.sum}</td>
          <td>${s.nullCount}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    </div>
  `
}

// ─── Anomaly panel ─────────────────────────────────────────────────────────────
function _injectAnomalyPanel() {
  const sec = document.createElement('section')
  sec.id        = 'anomalySection'
  sec.hidden    = true
  sec.style.cssText = 'padding:16px;border-top:1px solid var(--border)'
  sec.innerHTML = `
    <details>
      <summary style="cursor:pointer;font-size:13px;font-weight:600;padding:4px 0">⚠️ Detección de anomalías</summary>
      <div id="anomalyContent" style="margin-top:10px;font-size:12px"></div>
    </details>
  `
  $('main').appendChild(sec)
}

function renderAnomalies(dataset) {
  const sec = $('anomalySection')
  if (!sec) return
  sec.hidden = false
  const anomalies = analyzeAnomalies(dataset.rows, dataset.schema)
  const content   = $('anomalyContent')
  const fields    = Object.keys(anomalies)
  if (!fields.length) { content.innerHTML = '<p style="color:var(--text2)">Sin métricas para analizar</p>'; return }

  content.innerHTML = fields.map(f => {
    const a = anomalies[f]
    const total = new Set([...a.iqr, ...a.mad]).size
    return `
      <div style="margin-bottom:8px;padding:8px;background:var(--bg2);border-radius:6px;border:1px solid var(--border)">
        <b>${f}</b> &nbsp;
        <span style="color:${total > 0 ? 'var(--warning)' : 'var(--success)'}">
          ${total > 0 ? `⚠ ${total} posibles anomalías` : '✓ Sin anomalías detectadas'}
        </span>
        ${total > 0 ? `
          <div style="color:var(--text2);margin-top:4px">
            IQR: filas [${a.iqr.slice(0,8).join(', ')}${a.iqr.length > 8 ? '…' : ''}] &nbsp;|
            MAD: filas [${a.mad.slice(0,8).join(', ')}${a.mad.length > 8 ? '…' : ''}]
            ${a.cusum.length ? `<br>CUSUM: cambios de nivel en posiciones [${a.cusum.slice(0,5).join(', ')}]` : ''}
          </div>` : ''}
      </div>`
  }).join('')
}

// ─── Relations panel ───────────────────────────────────────────────────────────
function _injectRelationsPanel() {
  const sec = document.createElement('section')
  sec.id        = 'relationsSection'
  sec.hidden    = true
  sec.style.cssText = 'padding:16px;border-top:1px solid var(--border)'
  sec.innerHTML = `
    <details>
      <summary style="cursor:pointer;font-size:13px;font-weight:600;padding:4px 0">🔗 Relaciones detectadas</summary>
      <div id="relationsContent" style="margin-top:10px;font-size:12px"></div>
    </details>
  `
  $('main').appendChild(sec)
}

function renderRelations(dataset) {
  const sec = $('relationsSection')
  if (!sec) return
  sec.hidden = false
  const rels    = detectRelations(dataset.rows, dataset.schema)
  const content = $('relationsContent')
  if (!rels.length) {
    content.innerHTML = '<p style="color:var(--text2)">Sin relaciones detectadas</p>'
    return
  }
  content.innerHTML = rels.map(r => `
    <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">
      <code style="color:var(--accent)">${r.from}</code>
      <span style="color:var(--text2)">→</span>
      <code style="color:var(--accent)">${r.to}</code>
      <span class="badge badge-${r.type === 'FK_PATTERN' ? 'ID' : 'DIMENSION'}">${r.type}</span>
      <span style="color:var(--text2)">${(r.confidence * 100).toFixed(0)}%</span>
    </div>
  `).join('')
}

// ─── Render ────────────────────────────────────────────────────────────────────
function renderSchema(schema) {
  schemaSection.hidden = false
  schemaList.innerHTML = ''
  schema.forEach(({ field, type, confidence }) => {
    const li = document.createElement('li')
    li.innerHTML = `
      <span class="badge badge-${type}">${type}</span>
      <span title="Confianza: ${confidence ? (confidence*100).toFixed(0)+'%' : 'N/A'}">${field}</span>
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
  if (!dash.charts?.length) { chartGrid.hidden = true; return }
  chartGrid.hidden  = false
  emptyState.hidden = true
  chartGrid.innerHTML = ''
  dash.charts.forEach(chart => {
    const card = document.createElement('div')
    card.className = 'chart-card'
    card.innerHTML = `
      <div class="chart-card-header">
        <span class="chart-card-title">${chart.title}</span>
        <button class="btn-icon chart-del" data-id="${chart.id}" title="Eliminar chart">✕</button>
      </div>
      <div class="chart-canvas" id="c_${chart.id}"></div>
    `
    card.querySelector('.chart-del').addEventListener('click', () => removeChart(chart.id))
    chartGrid.appendChild(card)
    requestAnimationFrame(() => renderChart(`c_${chart.id}`, chart))
  })
}

function removeChart(chartId) {
  const updated = state.dashboards.map(d => {
    if (d.id !== state.activeDash) return d
    return { ...d, charts: d.charts.filter(c => c.id !== chartId) }
  })
  setState('dashboards', updated)
  saveDashboards(updated)
  renderActiveDashboard()
}

function deleteDashboard(id) {
  if (state.dashboards.length === 1) { alert('Debes tener al menos un dashboard.'); return }
  const updated = state.dashboards.filter(d => d.id !== id)
  setState('dashboards', updated)
  saveDashboards(updated)
  if (state.activeDash === id) setState('activeDash', updated[0].id)
  renderDashboardList()
  renderActiveDashboard()
}

// ─── Export ────────────────────────────────────────────────────────────────────
function exportCSV() {
  if (!state.dataset) return
  const { rows, name } = state.dataset
  if (!rows.length) return
  const cols   = Object.keys(rows[0])
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines  = [cols.join(','), ...rows.map(r => cols.map(c => escape(r[c])).join(','))]
  download(lines.join('\n'), name.replace(/\.[^.]+$/, '') + '_export.csv', 'text/csv')
}

function exportPNG() {
  const firstCanvas = chartGrid.querySelector('canvas')
  if (!firstCanvas) return
  const a = document.createElement('a')
  a.href     = firstCanvas.toDataURL('image/png')
  a.download = (state.dataset?.name ?? 'chart').replace(/\.[^.]+$/, '') + '.png'
  a.click()
}

function download(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function setStatus(type, msg) {
  ingestStatus.textContent = msg
  ingestStatus.className   = `status-msg ${type}`
}

// ─── Arrancar ──────────────────────────────────────────────────────────────────
init()

/**
 * builder.js — Panel de configuración de charts (drag & drop de columnas).
 * Permite al usuario arrastrar campos del schema a zonas X / Y / Group.
 * Sin librerías externas — usa HTML5 Drag & Drop API nativa.
 */

import { state, setState } from './state.js'
import { buildChartFromConfig } from './charts.js'
import { saveDashboards }       from './storage.js'
import { uid }                  from './state.js'

let _onChartAdded = null

/**
 * Monta el panel builder en el contenedor dado.
 * @param {string}   containerId
 * @param {Function} onChartAdded  callback(chartDef)
 */
export function mountBuilder(containerId, onChartAdded) {
  _onChartAdded = onChartAdded
  const container = document.getElementById(containerId)
  if (!container) return
  container.innerHTML = _builderHTML()
  _bindBuilder(container)
}

export function unmountBuilder(containerId) {
  const el = document.getElementById(containerId)
  if (el) el.innerHTML = ''
}

function _builderHTML() {
  const schema = state.dataset?.schema ?? []
  const fieldItems = schema.map(s => `
    <div class="field-chip" draggable="true" data-field="${s.field}" data-type="${s.type}">
      <span class="badge badge-${s.type}">${s.type[0]}</span>
      ${s.field}
    </div>
  `).join('')

  return `
  <div class="builder-panel">
    <div class="builder-col">
      <h4>Campos disponibles</h4>
      <div class="field-list" id="builderFieldList">${fieldItems}</div>
    </div>
    <div class="builder-col">
      <h4>Configurar chart</h4>
      <div class="builder-form">
        <label>Tipo
          <select id="builderType">
            <option value="auto">🤖 Auto</option>
            <option value="bar">📊 Barras</option>
            <option value="line">📈 Línea</option>
            <option value="pie">🥧 Pie</option>
            <option value="scatter">⚬ Scatter</option>
          </select>
        </label>
        <div class="drop-zone" id="dropX" data-role="x">
          <span class="drop-label">Eje X / Categoría</span>
        </div>
        <div class="drop-zone" id="dropY" data-role="y">
          <span class="drop-label">Eje Y / Métrica</span>
        </div>
        <div class="drop-zone" id="dropGroup" data-role="group">
          <span class="drop-label">Agrupar por (opcional)</span>
        </div>
        <div class="builder-actions">
          <button id="builderAddBtn" class="btn-sm">+ Agregar chart</button>
          <button id="builderResetBtn" class="btn-sm">↺ Limpiar</button>
        </div>
        <p id="builderMsg" class="status-msg"></p>
      </div>
    </div>
  </div>`
}

function _bindBuilder(container) {
  // Drag start desde field chips
  container.querySelectorAll('.field-chip').forEach(chip => {
    chip.addEventListener('dragstart', e => {
      e.dataTransfer.setData('field', chip.dataset.field)
      e.dataTransfer.setData('type',  chip.dataset.type)
      e.dataTransfer.effectAllowed = 'copy'
    })
  })

  // Drop zones
  container.querySelectorAll('.drop-zone').forEach(zone => {
    zone.addEventListener('dragover', e => {
      e.preventDefault()
      zone.classList.add('drag-over')
    })
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'))
    zone.addEventListener('drop', e => {
      e.preventDefault()
      zone.classList.remove('drag-over')
      const field = e.dataTransfer.getData('field')
      const type  = e.dataTransfer.getData('type')
      if (!field) return
      // Mostrar chip en la zona
      zone.innerHTML = `<div class="field-chip dropped" data-field="${field}" data-type="${type}">
        <span class="badge badge-${type}">${type[0]}</span> ${field}
        <span class="chip-remove" data-role="${zone.dataset.role}">✕</span>
      </div>`
      zone.querySelector('.chip-remove').addEventListener('click', () => {
        zone.innerHTML = `<span class="drop-label">${_zoneLabel(zone.dataset.role)}</span>`
      })
    })
  })

  // Agregar chart
  container.querySelector('#builderAddBtn').addEventListener('click', () => {
    const xField  = _getDropField('dropX')
    const yField  = _getDropField('dropY')
    const group   = _getDropField('dropGroup')
    const type    = container.querySelector('#builderType').value
    const msg     = container.querySelector('#builderMsg')

    if (!xField || !yField) {
      msg.className = 'status-msg err'
      msg.textContent = '✗ Asigna al menos Eje X y Eje Y'
      return
    }

    const chartDef = buildChartFromConfig({
      type, xField, yField, group,
      rows: state.dataset.rows,
    })

    // Agregar al dashboard activo
    const updated = state.dashboards.map(d => {
      if (d.id !== state.activeDash) return d
      return { ...d, charts: [...(d.charts ?? []), chartDef] }
    })
    setState('dashboards', updated)
    saveDashboards(updated)

    msg.className   = 'status-msg ok'
    msg.textContent = `✓ Chart "${chartDef.title}" agregado`
    if (_onChartAdded) _onChartAdded(chartDef)
  })

  // Limpiar
  container.querySelector('#builderResetBtn').addEventListener('click', () => {
    ;['dropX','dropY','dropGroup'].forEach(id => {
      const z = document.getElementById(id)
      if (z) z.innerHTML = `<span class="drop-label">${_zoneLabel(z.dataset.role)}</span>`
    })
    container.querySelector('#builderMsg').textContent = ''
  })
}

function _getDropField(zoneId) {
  const chip = document.getElementById(zoneId)?.querySelector('[data-field]')
  return chip?.dataset.field ?? null
}

function _zoneLabel(role) {
  return role === 'x' ? 'Eje X / Categoría'
       : role === 'y' ? 'Eje Y / Métrica'
       : 'Agrupar por (opcional)'
}

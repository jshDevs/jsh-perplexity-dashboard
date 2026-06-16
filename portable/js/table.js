/**
 * table.js — Tabla de datos con búsqueda, paginación y ordenamiento.
 * Puro DOM, sin librerías externas.
 */

let _rows     = []
let _filtered = []
let _sortCol  = null
let _sortDir  = 1     // 1 = ASC, -1 = DESC
let _page     = 0
const PAGE_SIZE = 50

// Referencias DOM (se asignan en init)
let _thead, _tbody, _search, _rowCount, _pageInfo, _pagePrev, _pageNext

export function initTable() {
  _thead    = document.getElementById('tableHead')
  _tbody    = document.getElementById('tableBody')
  _search   = document.getElementById('tableSearch')
  _rowCount = document.getElementById('rowCount')
  _pageInfo = document.getElementById('pageInfo')
  _pagePrev = document.getElementById('pagePrev')
  _pageNext = document.getElementById('pageNext')

  _search.addEventListener('input', () => {
    _page = 0
    _applyFilter()
  })
  _pagePrev.addEventListener('click', () => { _page = Math.max(0, _page - 1); _render() })
  _pageNext.addEventListener('click', () => {
    const maxPage = Math.ceil(_filtered.length / PAGE_SIZE) - 1
    _page = Math.min(maxPage, _page + 1)
    _render()
  })
}

export function loadTable(rows) {
  _rows = rows
  _page = 0
  _sortCol = null
  _sortDir = 1
  if (_search) _search.value = ''
  _applyFilter()
  _buildHeader(rows[0] ? Object.keys(rows[0]) : [])
}

function _buildHeader(cols) {
  _thead.innerHTML = ''
  const tr = document.createElement('tr')
  cols.forEach(col => {
    const th = document.createElement('th')
    th.textContent = col
    th.title = `Ordenar por ${col}`
    th.addEventListener('click', () => _toggleSort(col))
    tr.appendChild(th)
  })
  _thead.appendChild(tr)
}

function _toggleSort(col) {
  if (_sortCol === col) _sortDir *= -1
  else { _sortCol = col; _sortDir = 1 }
  _page = 0
  _applyFilter()
}

function _applyFilter() {
  const q = (_search?.value ?? '').toLowerCase().trim()
  _filtered = q
    ? _rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)))
    : [..._rows]

  if (_sortCol) {
    _filtered.sort((a, b) => {
      const av = a[_sortCol], bv = b[_sortCol]
      if (av === bv) return 0
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * _sortDir
      return String(av).localeCompare(String(bv)) * _sortDir
    })
  }
  _render()
}

function _render() {
  const total  = _filtered.length
  const start  = _page * PAGE_SIZE
  const end    = Math.min(start + PAGE_SIZE, total)
  const page   = _filtered.slice(start, end)

  _tbody.innerHTML = ''
  page.forEach(row => {
    const tr = document.createElement('tr')
    Object.values(row).forEach(val => {
      const td = document.createElement('td')
      td.textContent = val ?? ''
      td.title       = String(val ?? '')
      tr.appendChild(td)
    })
    _tbody.appendChild(tr)
  })

  _rowCount.textContent = `${total.toLocaleString()} filas`
  _pageInfo.textContent = total ? `${start + 1}–${end} de ${total}` : '0 resultados'
  _pagePrev.disabled    = _page === 0
  _pageNext.disabled    = end >= total
}

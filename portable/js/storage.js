/**
 * storage.js — Persistencia en localStorage
 * Serializa/deserializa dashboards y tema.
 */

const KEYS = {
  dashboards: 'jsh_local_dashboards',
  lastDataset: 'jsh_local_last_dataset',
  theme:       'jsh_local_theme',
}

export function saveDashboards(dashboards) {
  try {
    localStorage.setItem(KEYS.dashboards, JSON.stringify(dashboards))
  } catch { /* quota excedida — ignorar */ }
}

export function loadDashboards() {
  try {
    const raw = localStorage.getItem(KEYS.dashboards)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

/**
 * Guarda el último dataset (nombre + schema + primeras 200 filas).
 * NO guarda filas completas para evitar saturar localStorage.
 */
export function saveLastDataset(dataset) {
  try {
    const slim = {
      name:   dataset.name,
      schema: dataset.schema,
      rows:   dataset.rows.slice(0, 200),
    }
    localStorage.setItem(KEYS.lastDataset, JSON.stringify(slim))
  } catch { /* quota excedida — ignorar */ }
}

export function loadLastDataset() {
  try {
    const raw = localStorage.getItem(KEYS.lastDataset)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveTheme(theme) {
  localStorage.setItem(KEYS.theme, theme)
}

export function loadTheme() {
  return localStorage.getItem(KEYS.theme) ?? 'dark'
}

export function clearAll() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
}

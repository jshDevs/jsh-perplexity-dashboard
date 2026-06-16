/**
 * state.js — Estado global reactivo minimal
 * Sin framework. Usa un patrón pub/sub simple.
 */

const _listeners = {}

export const state = {
  dataset:    null,   // { name, rows[], schema[] }
  dashboards: [],     // [{ id, name, charts[] }]
  activeDash: null,   // id del dashboard activo
  theme:      'dark',
}

/**
 * Actualiza una clave del estado y notifica suscriptores.
 * @param {string} key
 * @param {any}    value
 */
export function setState(key, value) {
  state[key] = value
  if (_listeners[key]) {
    _listeners[key].forEach(fn => fn(value))
  }
  if (_listeners['*']) {
    _listeners['*'].forEach(fn => fn({ key, value }))
  }
}

/**
 * Suscribirse a cambios de una clave (o '*' para cualquier cambio).
 * @param {string}   key
 * @param {Function} fn
 */
export function subscribe(key, fn) {
  if (!_listeners[key]) _listeners[key] = []
  _listeners[key].push(fn)
}

/** Genera un ID único de 8 chars */
export function uid() {
  return Math.random().toString(36).slice(2, 10)
}

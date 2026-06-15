/**
 * filterUrlSync — sincroniza el estado de filtros con la URL
 * usando nuqs para filter bookmarks compartibles en intranet.
 *
 * Formato URL: ?filters=base64(JSON)
 * Ejemplo: ?filters=eyJmaWVsZCI6InpvbmEiLCJ2YWx1ZXMiOlsiTm9ydGUiXX0K
 *
 * Se usa como hook en el root layout para mantener URL sincronizada.
 */
import { useEffect } from 'react'
import { useFilterStore } from './filterStore'
import type { ActiveFilter } from './filterStore'

const PARAM = 'filters'

function encode(filters: ActiveFilter[]): string {
  if (filters.length === 0) return ''
  return btoa(encodeURIComponent(JSON.stringify(filters)))
}

function decode(raw: string): ActiveFilter[] {
  try {
    return JSON.parse(decodeURIComponent(atob(raw)))
  } catch {
    return []
  }
}

/** Escribe filtros actuales en la URL (history.replaceState). */
export function useFilterUrlSync() {
  const filters = useFilterStore((s) => s.filters)
  const setFilter = useFilterStore((s) => s.setFilter)
  const clearAll  = useFilterStore((s) => s.clearAll)

  // Hidratar desde URL en mount
  useEffect(() => {
    const url    = new URL(window.location.href)
    const raw    = url.searchParams.get(PARAM)
    if (!raw) return
    const loaded = decode(raw)
    loaded.forEach((f) => setFilter(f.field, f.values, f.source))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // solo en mount

  // Sincronizar filtros → URL
  useEffect(() => {
    const url = new URL(window.location.href)
    const encoded = encode(filters)
    if (encoded) {
      url.searchParams.set(PARAM, encoded)
    } else {
      url.searchParams.delete(PARAM)
    }
    window.history.replaceState(null, '', url.toString())
  }, [filters])

  return { filters, clearAll }
}

/** Genera una URL compartible con los filtros actuales. */
export function buildShareUrl(filters: ActiveFilter[]): string {
  const url = new URL(window.location.href)
  const encoded = encode(filters)
  if (encoded) url.searchParams.set(PARAM, encoded)
  else url.searchParams.delete(PARAM)
  return url.toString()
}

/**
 * jsonParser — parsea JSON plano y anidado.
 * Soporta: array raíz, objeto con key array, JSON Lines (ndjson).
 * Aplanado de objetos anidados con notación dot (max 2 niveles).
 */
import { readFileSync } from 'fs'
import { sanitizeRows } from '../security'
import type { ParsedDataset } from '../types'

function flattenObject(
  obj:    Record<string, unknown>,
  prefix: string = '',
  depth:  number = 0,
): Record<string, unknown> {
  if (depth > 2) return { [prefix]: JSON.stringify(obj) }
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey, depth + 1))
    } else {
      result[newKey] = Array.isArray(value) ? JSON.stringify(value) : value
    }
  }
  return result
}

function extractRows(parsed: unknown): Record<string, unknown>[] {
  // 1. Array directo
  if (Array.isArray(parsed)) {
    return parsed.filter((r) => r && typeof r === 'object')
  }
  // 2. Objeto con una key que contiene array (ej: { data: [...] })
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key])) {
        return (obj[key] as unknown[]).filter((r) => r && typeof r === 'object') as Record<string, unknown>[]
      }
    }
    // 3. Objeto único → array de 1
    return [obj]
  }
  return []
}

function parseNdjson(raw: string): unknown[] {
  return raw
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line))
}

export function parseJson(
  filePath:     string,
  originalName: string,
  datasetId:    string,
): ParsedDataset {
  const raw      = readFileSync(filePath, 'utf-8').trim()
  const warnings: string[] = []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Intentar como NDJSON/JSON Lines
    try {
      parsed = parseNdjson(raw)
      warnings.push('Formato detectado: JSON Lines (NDJSON)')
    } catch {
      throw new Error('El archivo no es JSON válido ni JSON Lines')
    }
  }

  const rawRows = extractRows(parsed)
  const flatRows = rawRows.map((r) => flattenObject(r as Record<string, unknown>))
  const sanitized = sanitizeRows(flatRows)
  const columns = [...new Set(sanitized.flatMap((r) => Object.keys(r)))]

  if (rawRows.length !== flatRows.length) {
    warnings.push(`${rawRows.length - flatRows.length} filas descartadas (no eran objetos)`)
  }

  return {
    datasetId,
    filename:  originalName,
    format:    'json',
    rows:      sanitized,
    rowCount:  sanitized.length,
    columns,
    warnings,
  }
}

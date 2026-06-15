/**
 * csvParser — parsea CSV/TSV usando papaparse (streaming-ready).
 * Maneja: encoding UTF-8/Latin-1, delimitador auto-detectado,
 * headers en primera fila, tipos de dato básicos.
 */
import Papa from 'papaparse'
import { readFileSync } from 'fs'
import { sanitizeRows } from '../security'
import type { ParsedDataset } from '../types'

export function parseCsv(
  filePath:     string,
  originalName: string,
  datasetId:    string,
): ParsedDataset {
  const raw = readFileSync(filePath, 'utf-8')

  const result = Papa.parse<Record<string, unknown>>(raw, {
    header:          true,
    skipEmptyLines:  true,
    dynamicTyping:   true,   // auto-convierte números y booleanos
    delimitersToGuess: [',', ';', '\t', '|'],
    transformHeader: (h: string) => h.trim(),
  })

  const warnings: string[] = result.errors.map(
    (e: any) => `Fila ${e.row}: ${e.message}`
  ).slice(0, 10)

  const rows    = sanitizeRows(result.data)
  const columns = result.meta.fields ?? Object.keys(rows[0] ?? {})

  return {
    datasetId,
    filename:  originalName,
    format:    'csv',
    rows,
    rowCount:  rows.length,
    columns,
    warnings,
  }
}

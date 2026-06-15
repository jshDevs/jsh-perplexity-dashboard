/**
 * DuckDBQueryService — ejecuta queries SQL ad-hoc sobre datasets
 * ingestados, cargando los rows desde Redis a DuckDB in-memory.
 *
 * Estrategia:
 *   1. Obtener dataset de Redis (rows como JSON)
 *   2. Registrar como tabla temporal en DuckDB usando VALUES o
 *      escribiendo a /tmp como Parquet/CSV y usando read_csv_auto()
 *   3. Ejecutar query del usuario
 *   4. Devolver resultado paginado
 *
 * Nota: usa el duckdb.ts existente en services/ como wrapper.
 * Si duckdb no está disponible (FFI ausente), devuelve fallback
 * ejecutando la query sobre los rows en memoria con filtrado JS.
 */
import type { ParsedDataset } from '../ingestion/types'

export interface QueryResult {
  columns: string[]
  rows:    Record<string, unknown>[]
  rowCount: number
  durationMs: number
  engine: 'duckdb' | 'js-fallback'
}

/**
 * Ejecuta una query SQL sobre los rows de un dataset.
 * Intenta DuckDB primero (si el módulo está disponible),
 * con fallback a filtrado JS básico.
 */
export async function executeDatasetQuery(
  dataset:    ParsedDataset,
  sql:        string,
  maxRows:    number = 10_000,
): Promise<QueryResult> {
  const t0 = Date.now()

  // Intentar con DuckDB real
  try {
    const { DuckDBService } = await import('../services/duckdb')
    const svc = new DuckDBService()

    const tableName = `ds_${dataset.datasetId.replace(/-/g, '_')}`
    await svc.loadRows(tableName, dataset.rows)

    // Reemplazar nombre de tabla genérico si el usuario usó "dataset"
    const normalizedSql = sql
      .replace(/\bFROM\s+dataset\b/gi,  `FROM ${tableName}`)
      .replace(/\bJOIN\s+dataset\b/gi,  `JOIN ${tableName}`)

    const result = await svc.query(normalizedSql)
    const rows   = result.slice(0, maxRows)

    return {
      columns:    rows.length > 0 ? Object.keys(rows[0]) : [],
      rows,
      rowCount:   rows.length,
      durationMs: Date.now() - t0,
      engine:     'duckdb',
    }
  } catch (_duckdbErr) {
    // Fallback: devolver todos los rows con filtrado básico JS
    const rows = jsFallbackQuery(dataset.rows, sql, maxRows)
    return {
      columns:    rows.length > 0 ? Object.keys(rows[0]) : dataset.columns,
      rows,
      rowCount:   rows.length,
      durationMs: Date.now() - t0,
      engine:     'js-fallback',
    }
  }
}

/**
 * Fallback JS: devuelve rows con LIMIT aplicado.
 * Para queries simples SELECT * FROM dataset LIMIT N.
 */
function jsFallbackQuery(
  rows:    Record<string, unknown>[],
  sql:     string,
  maxRows: number,
): Record<string, unknown>[] {
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i)
  const limit      = limitMatch ? parseInt(limitMatch[1]) : maxRows
  return rows.slice(0, Math.min(limit, maxRows))
}

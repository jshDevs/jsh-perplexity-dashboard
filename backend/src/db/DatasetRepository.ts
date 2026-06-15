/**
 * DatasetRepository — CRUD de datasets en PostgreSQL.
 *
 * Patrón Repository: aísla la lógica SQL del resto de la aplicación.
 * Todos los métodos son async y retornan objetos tipados.
 */
import type { Pool }    from 'pg'
import type { InferredSchema } from '../inference/types'

export interface DatasetRecord {
  id:           string
  name:         string
  sourceType:   'csv' | 'excel' | 'json' | 'sql' | 'parquet'
  rowCount:     number
  columnCount:  number
  fileSize:     number
  schemaJson:   InferredSchema[]
  previewJson:  Record<string, unknown>[]
  ingestStatus: 'pending' | 'processing' | 'ready' | 'error'
  errorMsg?:    string
  createdAt:    string
  updatedAt:    string
}

function toRecord(row: any): DatasetRecord {
  return {
    id:           row.id,
    name:         row.name,
    sourceType:   row.source_type,
    rowCount:     row.row_count,
    columnCount:  row.column_count,
    fileSize:     row.file_size,
    schemaJson:   row.schema_json,
    previewJson:  row.preview_json,
    ingestStatus: row.ingest_status,
    errorMsg:     row.error_msg ?? undefined,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  }
}

export class DatasetRepository {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<DatasetRecord | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM datasets WHERE id = $1',
      [id]
    )
    return rows.length ? toRecord(rows[0]) : null
  }

  async findAll(limit = 50, offset = 0): Promise<DatasetRecord[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM datasets ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    )
    return rows.map(toRecord)
  }

  async findByStatus(status: DatasetRecord['ingestStatus']): Promise<DatasetRecord[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM datasets WHERE ingest_status = $1 ORDER BY created_at DESC',
      [status]
    )
    return rows.map(toRecord)
  }

  async upsert(data: Omit<DatasetRecord, 'createdAt' | 'updatedAt'>): Promise<DatasetRecord> {
    const { rows } = await this.pool.query(
      `INSERT INTO datasets
         (id, name, source_type, row_count, column_count, file_size,
          schema_json, preview_json, ingest_status, error_msg)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         name          = EXCLUDED.name,
         source_type   = EXCLUDED.source_type,
         row_count     = EXCLUDED.row_count,
         column_count  = EXCLUDED.column_count,
         file_size     = EXCLUDED.file_size,
         schema_json   = EXCLUDED.schema_json,
         preview_json  = EXCLUDED.preview_json,
         ingest_status = EXCLUDED.ingest_status,
         error_msg     = EXCLUDED.error_msg
       RETURNING *`,
      [
        data.id, data.name, data.sourceType,
        data.rowCount, data.columnCount, data.fileSize,
        JSON.stringify(data.schemaJson),
        JSON.stringify(data.previewJson),
        data.ingestStatus, data.errorMsg ?? null,
      ]
    )
    return toRecord(rows[0])
  }

  async updateStatus(
    id: string,
    status: DatasetRecord['ingestStatus'],
    errorMsg?: string
  ): Promise<void> {
    await this.pool.query(
      'UPDATE datasets SET ingest_status = $1, error_msg = $2 WHERE id = $3',
      [status, errorMsg ?? null, id]
    )
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM datasets WHERE id = $1', [id])
  }

  async count(): Promise<number> {
    const { rows } = await this.pool.query('SELECT COUNT(*)::int AS n FROM datasets')
    return rows[0].n
  }
}

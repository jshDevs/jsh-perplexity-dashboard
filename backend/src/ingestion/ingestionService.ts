/**
 * ingestionService — orquestador del pipeline de ingestión:
 *   upload → security → parse → store en Redis (dataset cache)
 *
 * El dataset se guarda en Redis como JSON string con TTL configurable.
 * Límite de almacenamiento: MAX_DATASET_ROWS (default 100k filas).
 */
import { randomUUID }  from 'crypto'
import path            from 'path'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { validateFile } from './security'
import { parseCsv }    from './parsers/csvParser'
import { parseExcel }  from './parsers/excelParser'
import { parseJson }   from './parsers/jsonParser'
import type { ParsedDataset, IngestFormat } from './types'

const UPLOAD_DIR      = process.env.UPLOAD_DIR      ?? '/tmp/jsh-uploads'
const DATASET_TTL_SEC = parseInt(process.env.DATASET_TTL_SEC ?? String(3600 * 24))  // 24h
const MAX_DATASET_ROWS = parseInt(process.env.MAX_DATASET_ROWS ?? '100000')

function detectFormat(filename: string): IngestFormat {
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.csv')                    return 'csv'
  if (ext === '.xlsx' || ext === '.xls') return 'excel'
  if (ext === '.json')                   return 'json'
  throw new Error(`Formato no soportado: ${ext}`)
}

export class IngestionService {
  constructor(private redis: any) {}

  async ingest(
    fileBuffer:   Buffer,
    originalName: string,
    sheetName?:   string,
  ): Promise<{ datasetId: string; dataset: ParsedDataset }> {
    const datasetId = randomUUID()
    const format    = detectFormat(originalName)
    const safeExt   = path.extname(originalName).toLowerCase()
    const tmpPath   = path.join(UPLOAD_DIR, `${datasetId}${safeExt}`)

    // Guardar archivo temporal
    if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })
    writeFileSync(tmpPath, fileBuffer)

    // Pipeline de seguridad
    const security = validateFile(tmpPath, originalName)
    if (!security.ok) {
      throw new Error(`Validación de seguridad fallida: ${security.errors.join('; ')}`)
    }

    // Parseo según formato
    let dataset: ParsedDataset
    if (format === 'csv') {
      dataset = parseCsv(tmpPath, originalName, datasetId)
    } else if (format === 'excel') {
      dataset = await parseExcel(tmpPath, originalName, datasetId, sheetName)
    } else {
      dataset = parseJson(tmpPath, originalName, datasetId)
    }

    // Añadir warnings de seguridad
    dataset.warnings.push(...security.warnings)

    // Límite de filas
    if (dataset.rows.length > MAX_DATASET_ROWS) {
      dataset.rows    = dataset.rows.slice(0, MAX_DATASET_ROWS)
      dataset.rowCount = MAX_DATASET_ROWS
      dataset.warnings.push(`Dataset truncado a ${MAX_DATASET_ROWS} filas`)
    }

    // Persistir en Redis con TTL
    const key = `dataset:${datasetId}`
    await this.redis.set(key, JSON.stringify(dataset), { EX: DATASET_TTL_SEC })

    return { datasetId, dataset }
  }

  async getDataset(datasetId: string): Promise<ParsedDataset | null> {
    const raw = await this.redis.get(`dataset:${datasetId}`)
    if (!raw) return null
    return JSON.parse(raw) as ParsedDataset
  }

  async listDatasets(): Promise<string[]> {
    const keys = await this.redis.keys('dataset:*')
    return keys.map((k: string) => k.replace('dataset:', ''))
  }

  async deleteDataset(datasetId: string): Promise<void> {
    await this.redis.del(`dataset:${datasetId}`)
  }
}

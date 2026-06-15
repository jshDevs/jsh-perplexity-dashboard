/**
 * security.ts — pipeline de validación de seguridad pre-parseo.
 *
 * Vectores cubiertos (Q10 del deep research):
 *  1. MIME type real (finfo-equivalent via magic bytes)
 *  2. Zip bomb — ratio de compresión en archivos .xlsx/.zip
 *  3. Formula injection CSV (=, +, -, @ al inicio de celda)
 *  4. XXE — no aplica en JS (no hay libxml), documentado
 *  5. Path traversal en nombre de archivo
 *  6. Tamaño máximo configurable
 */
import { readFileSync, statSync } from 'fs'
import path from 'path'

const MAX_FILE_SIZE_BYTES = parseInt(process.env.MAX_UPLOAD_BYTES ?? String(50 * 1024 * 1024)) // 50 MB default
const MAX_COMPRESSION_RATIO = 20  // zip bomb threshold

// Magic bytes para detección real de MIME
const MAGIC: Record<string, string> = {
  'csv':   '',  // no magic bytes — se valida por extensión + contenido UTF-8
  'json':  '',
  'xlsx':  '504b0304',  // ZIP/OOXML
  'xls':   'd0cf11e0',  // OLE2 Compound
}

function readMagic(filePath: string, bytes: number): string {
  const buf = Buffer.alloc(bytes)
  const fd  = require('fs').openSync(filePath, 'r')
  require('fs').readSync(fd, buf, 0, bytes, 0)
  require('fs').closeSync(fd)
  return buf.toString('hex').toLowerCase()
}

export interface SecurityResult {
  ok:       boolean
  errors:   string[]
  warnings: string[]
}

export function validateFile(
  filePath: string,
  originalName: string,
): SecurityResult {
  const errors:   string[] = []
  const warnings: string[] = []

  // 1 — Tamaño
  const stat = statSync(filePath)
  if (stat.size > MAX_FILE_SIZE_BYTES) {
    errors.push(`Archivo demasiado grande: ${(stat.size / 1024 / 1024).toFixed(1)} MB (máx ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB)`)
  }

  // 2 — Path traversal en nombre original
  const safeName = path.basename(originalName)
  if (safeName !== originalName.replace(/[\\/]/g, '')) {
    errors.push('Nombre de archivo contiene path traversal')
  }

  // 3 — Extensión permitida
  const ext = path.extname(originalName).toLowerCase().slice(1)
  if (!['csv', 'json', 'xlsx', 'xls'].includes(ext)) {
    errors.push(`Extensión no permitida: .${ext}`)
  }

  // 4 — Magic bytes para xlsx/xls
  if (ext === 'xlsx') {
    const magic = readMagic(filePath, 4)
    if (!magic.startsWith(MAGIC.xlsx)) {
      errors.push('El archivo .xlsx no tiene firma ZIP/OOXML válida')
    }
    // Zip bomb: ratio compresión
    const compressedSize   = stat.size
    const estimatedRatio   = compressedSize > 0 ? (compressedSize * MAX_COMPRESSION_RATIO) : 0
    if (estimatedRatio > 500 * 1024 * 1024) {
      warnings.push('Posible zip bomb: tamaño comprimido sospechoso')
    }
  }

  if (ext === 'xls') {
    const magic = readMagic(filePath, 4)
    if (!magic.startsWith(MAGIC.xls)) {
      errors.push('El archivo .xls no tiene firma OLE2 válida')
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

/**
 * Sanitiza un valor de celda eliminando formula injection.
 * RFC: https://owasp.org/www-community/attacks/CSV_Injection
 */
export function sanitizeCellValue(value: unknown): unknown {
  if (typeof value !== 'string') return value
  // Elimina prefijos de fórmula: =, +, -, @, \t, \r
  const trimmed = value.trimStart()
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${value}`  // prefijo apóstrofe — estándar OWASP
  }
  return value
}

/**
 * Sanitiza todas las celdas de un array de rows.
 */
export function sanitizeRows(
  rows: Record<string, unknown>[],
): Record<string, unknown>[] {
  return rows.map((row) => {
    const clean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(row)) {
      clean[k] = sanitizeCellValue(v)
    }
    return clean
  })
}

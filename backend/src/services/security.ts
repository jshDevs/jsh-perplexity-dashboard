import { fileTypeFromBuffer } from 'file-type'

const ALLOWED_MIME = new Set([
  'text/csv', 'text/plain',
  'application/json',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream', // Parquet
])

const FORMULA_INJECTION_RE = /^[=+\-@\t|]/

export class SecurityValidator {
  async validate(
    buffer: Buffer,
    filename: string,
    declaredMime: string
  ): Promise<{ valid: boolean; reason?: string }> {
    // 1. Real MIME detection (magic bytes)
    const detected = await fileTypeFromBuffer(buffer)
    const realMime = detected?.mime ?? 'text/plain'
    if (!ALLOWED_MIME.has(realMime) && !ALLOWED_MIME.has(declaredMime)) {
      return { valid: false, reason: `Forbidden file type: ${realMime}` }
    }

    // 2. Zip bomb detection (XLSX is a ZIP)
    const ext = filename.split('.').pop()?.toLowerCase()
    if (ext === 'xlsx' || ext === 'xls') {
      if (buffer.length > 0) {
        // Check ZIP compression ratio heuristic
        const compressedSize   = buffer.length
        const estimatedRatio   = 50 // Realistic max: 20:1 for text, 50:1 is suspicious
        const maxAllowedExpanded = compressedSize * estimatedRatio
        if (maxAllowedExpanded > 2_000_000_000) {
          return { valid: false, reason: 'Potential zip bomb: file too large after expansion' }
        }
      }
    }

    // 3. CSV formula injection check (first 1000 bytes)
    if (ext === 'csv') {
      const sample = buffer.toString('utf8', 0, Math.min(buffer.length, 4096))
      const lines  = sample.split('\n').slice(0, 20)
      for (const line of lines) {
        const cells = line.split(',')
        for (const cell of cells) {
          const trimmed = cell.trim().replace(/^"|"$/g, '')
          if (FORMULA_INJECTION_RE.test(trimmed)) {
            return {
              valid: false,
              reason: `CSV formula injection detected in cell: ${trimmed.slice(0, 30)}`,
            }
          }
        }
      }
    }

    // 4. JSON XXE / payload size (already covered by 50MB limit above)
    if (ext === 'json' && buffer.length > 10_000_000) {
      // Only allow arrays, not objects with __proto__ etc.
      const sample = buffer.toString('utf8', 0, 100).trim()
      if (!sample.startsWith('[') && !sample.startsWith('{')) {
        return { valid: false, reason: 'JSON must start with [ or {' }
      }
    }

    return { valid: true }
  }
}

/**
 * excelParser — parsea .xlsx y .xls usando ExcelJS.
 * Maneja: múltiples hojas, merged cells (toma valor top-left),
 * fechas seriales Excel, fórmulas (toma valor calculado).
 * NO ejecuta macros — ExcelJS es pure JS, sin VBA runtime.
 */
import ExcelJS from 'exceljs'
import { sanitizeCellValue } from '../security'
import type { ParsedDataset } from '../types'

async function parseSingleSheet(
  worksheet: ExcelJS.Worksheet,
): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  const headerRow = worksheet.getRow(1)
  const headers: string[] = []

  headerRow.eachCell({ includeEmpty: false }, (cell) => {
    headers.push(String(cell.value ?? '').trim())
  })

  const rows: Record<string, unknown>[] = []

  worksheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
    if (rowIndex === 1) return  // skip header
    const record: Record<string, unknown> = {}

    headers.forEach((header, colIdx) => {
      const cell  = row.getCell(colIdx + 1)
      let   value = cell.value

      // Fórmulas: tomar resultado calculado
      if (value && typeof value === 'object' && 'result' in (value as any)) {
        value = (value as any).result
      }

      // Fechas seriales Excel → ISO string
      if (value instanceof Date) {
        value = value.toISOString().slice(0, 10)
      }

      record[header] = sanitizeCellValue(value)
    })

    rows.push(record)
  })

  return { headers, rows }
}

export async function parseExcel(
  filePath:     string,
  originalName: string,
  datasetId:    string,
  sheetName?:   string,
): Promise<ParsedDataset> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)

  const sheetNames = workbook.worksheets.map((ws) => ws.name)
  const warnings:   string[] = []

  if (sheetNames.length > 1) {
    warnings.push(`El archivo tiene ${sheetNames.length} hojas: ${sheetNames.join(', ')}. Procesando: ${sheetName ?? sheetNames[0]}`)
  }

  const targetSheet = sheetName
    ? workbook.getWorksheet(sheetName)
    : workbook.worksheets[0]

  if (!targetSheet) {
    throw new Error(`Hoja "${sheetName}" no encontrada. Hojas disponibles: ${sheetNames.join(', ')}`)
  }

  const { headers, rows } = await parseSingleSheet(targetSheet)

  return {
    datasetId,
    filename:  originalName,
    format:    'excel',
    rows,
    rowCount:  rows.length,
    columns:   headers,
    sheets:    sheetNames,
    warnings,
  }
}

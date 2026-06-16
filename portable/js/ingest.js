/**
 * ingest.js — Lectura de archivos CSV y JSON desde el navegador.
 * Usa FileReader nativo. No depende de librerías externas.
 */

/**
 * Lee un File y retorna un array de objetos.
 * @param {File} file
 * @returns {Promise<Object[]>}
 */
export function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const text = e.target.result
        if (file.name.endsWith('.json')) {
          resolve(parseJSON(text))
        } else {
          resolve(parseCSV(text))
        }
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsText(file, 'UTF-8')
  })
}

/** Parseo CSV manual — RFC 4180 básico */
export function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  // Ignorar líneas vacías del final
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  if (lines.length < 2) throw new Error('CSV vacío o sin cabecera')

  const headers = parseLine(lines[0])
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const values = parseLine(lines[i])
    const row = {}
    headers.forEach((h, idx) => {
      const val = values[idx] ?? ''
      // Intentar convertir a número
      const num = Number(val)
      row[h] = (val !== '' && !isNaN(num)) ? num : val
    })
    rows.push(row)
  }
  return rows
}

/** Parsea una línea CSV respetando campos entre comillas */
function parseLine(line) {
  const fields = []
  let cur = ''
  let inQ = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (ch === ',' && !inQ) {
      fields.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  fields.push(cur.trim())
  return fields
}

/** Parseo JSON: acepta array o array bajo una clave */
export function parseJSON(text) {
  const data = JSON.parse(text)
  if (Array.isArray(data)) return flattenRows(data)
  // Buscar la primera clave que sea array
  for (const key of Object.keys(data)) {
    if (Array.isArray(data[key])) return flattenRows(data[key])
  }
  throw new Error('JSON no contiene un array de objetos')
}

/** Aplana objetos anidados: { a: { b: 1 } } → { 'a.b': 1 } */
export function flattenRows(rows) {
  return rows.map(row => flattenObj(row))
}

function flattenObj(obj, prefix = '') {
  const result = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flattenObj(v, key))
    } else {
      result[key] = v
    }
  }
  return result
}

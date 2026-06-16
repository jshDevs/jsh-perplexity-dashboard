/**
 * relations.js — Detección automática de relaciones entre campos.
 * Sin LLM. Heurísticas:
 *  1. Sufijo/prefijo _id / id_ entre datasets o dentro del mismo schema
 *  2. Campos con nombre idéntico entre schemas
 *  3. Overlap de valores (Jaccard similarity) para campos de igual tipo
 */

/**
 * Detecta relaciones dentro de un schema/dataset.
 * @param {Object[]} rows
 * @param {Array<{field,type}>} schema
 * @returns {Array<{from, to, type, confidence}>}
 */
export function detectRelations(rows, schema) {
  const relations = []
  const fields    = schema.map(s => s.field)

  // 1. Pares _id → campo de igual raíz
  fields.forEach(f => {
    if (!/_id$/i.test(f)) return
    const root = f.replace(/_id$/i, '').toLowerCase()
    const match = fields.find(g =>
      g !== f &&
      (g.toLowerCase() === root ||
       g.toLowerCase().startsWith(root + '_') ||
       g.toLowerCase().endsWith('_' + root))
    )
    if (match) {
      relations.push({ from: f, to: match, type: 'FK_PATTERN', confidence: 0.9 })
    }
  })

  // 2. Campos con misma distribución de valores (Jaccard)
  const dimFields = schema.filter(s => s.type === 'DIMENSION' || s.type === 'ID')
  for (let i = 0; i < dimFields.length; i++) {
    for (let j = i + 1; j < dimFields.length; j++) {
      const a = dimFields[i].field
      const b = dimFields[j].field
      const setA = new Set(rows.map(r => String(r[a])))
      const setB = new Set(rows.map(r => String(r[b])))
      const intersection = [...setA].filter(v => setB.has(v)).length
      const union        = new Set([...setA, ...setB]).size
      const jaccard      = union > 0 ? intersection / union : 0
      if (jaccard > 0.7 && jaccard < 1.0) {
        relations.push({ from: a, to: b, type: 'VALUE_OVERLAP', confidence: +jaccard.toFixed(2) })
      }
    }
  }

  return relations
}

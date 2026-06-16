/**
 * stats.js — Estadísticas descriptivas básicas por columna.
 * Retorna: min, max, mean, median, std, nullCount, uniqueCount.
 */

/**
 * @param {Object[]} rows
 * @param {Array<{field,type}>} schema
 * @returns {Object}  { [field]: stats }
 */
export function computeStats(rows, schema) {
  const result = {}
  schema.forEach(({ field, type }) => {
    const values = rows.map(r => r[field])
    const nullCount = values.filter(v => v === null || v === undefined || v === '').length
    const uniqCount = new Set(values.map(String)).size

    if (type === 'METRIC') {
      const nums = values.filter(v => typeof v === 'number' && !isNaN(v))
      if (nums.length === 0) {
        result[field] = { type, nullCount, uniqCount, count: 0 }
        return
      }
      const sorted = [...nums].sort((a, b) => a - b)
      const mean   = nums.reduce((s, v) => s + v, 0) / nums.length
      const std    = Math.sqrt(nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length)
      result[field] = {
        type,
        count:   nums.length,
        nullCount,
        uniqCount,
        min:     sorted[0],
        max:     sorted[sorted.length - 1],
        mean:    +mean.toFixed(4),
        median:  +median(sorted).toFixed(4),
        std:     +std.toFixed(4),
        sum:     +nums.reduce((s, v) => s + v, 0).toFixed(4),
      }
    } else {
      // DIMENSION / TIME / ID / TEXT
      const topValues = topN(values.filter(v => v !== null && v !== undefined && v !== ''), 5)
      result[field] = { type, count: values.length, nullCount, uniqCount, topValues }
    }
  })
  return result
}

function median(sorted) {
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function topN(values, n) {
  const freq = {}
  values.forEach(v => { const k = String(v); freq[k] = (freq[k] || 0) + 1 })
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([val, count]) => ({ val, count }))
}

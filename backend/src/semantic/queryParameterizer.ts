/**
 * QueryParameterizer — resuelve {{param}} en SQL templates.
 *
 * Separado del MetricsRegistry para responsabilidades claras:
 *   MetricsRegistry  → expande métricas/dimensiones semánticas
 *   QueryParameterizer → inyecta valores de parámetros de usuario
 *
 * Seguridad:
 *   - Strings: escapados con comillas simples + escape de ' → ''
 *   - Numbers: validados como float/int antes de inyectar
 *   - Dates: validados con regex ISO 8601 (YYYY-MM-DD)
 *   - Booleans: TRUE/FALSE literal SQL
 *   - NO permite concatenación libre — cada param tipado
 *
 * Uso:
 *   const q = new QueryParameterizer(params)
 *   const { sql, errors } = q.resolve(template, inputValues)
 */
import type { QueryParam, ResolvedQuery } from './types'

function escapeString(val: string): string {
  // Escapa comillas simples: ' → ''
  return `'${val.replace(/'/g, "''")}'`
}

function isValidDate(val: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(val)
}

function isValidNumber(val: unknown): boolean {
  return typeof val === 'number' && isFinite(val)
}

export class QueryParameterizer {
  constructor(private paramDefs: QueryParam[]) {}

  /**
   * Resuelve {{param}} en el template SQL.
   * @param template  SQL con {{param_name}} placeholders
   * @param values    Objeto con valores de usuario
   * @returns         { sql, params, errors }
   */
  resolve(
    template: string,
    values:   Record<string, unknown>,
  ): ResolvedQuery {
    const errors:  string[] = []
    const resolved: Record<string, string | number | boolean> = {}

    // Aplicar defaults y validar
    for (const def of this.paramDefs) {
      const raw = values[def.name] ?? def.default

      if (raw === undefined || raw === null) {
        if (def.required) errors.push(`Parámetro requerido faltante: {{${def.name}}}`)
        continue
      }

      switch (def.type) {
        case 'string':
          resolved[def.name] = escapeString(String(raw))
          break

        case 'number': {
          const n = Number(raw)
          if (!isValidNumber(n)) {
            errors.push(`Parámetro {{${def.name}}} debe ser numérico, recibido: ${raw}`)
          } else {
            resolved[def.name] = n
          }
          break
        }

        case 'date': {
          const d = String(raw)
          if (!isValidDate(d)) {
            errors.push(`Parámetro {{${def.name}}} debe ser fecha YYYY-MM-DD, recibido: ${raw}`)
          } else {
            resolved[def.name] = escapeString(d)
          }
          break
        }

        case 'boolean':
          resolved[def.name] = Boolean(raw) ? 'TRUE' : 'FALSE'
          break
      }
    }

    if (errors.length > 0) {
      return { sql: template, params: resolved, errors }
    }

    // Sustituir en template
    let sql = template
    for (const [name, value] of Object.entries(resolved)) {
      sql = sql.replace(new RegExp(`\\{\\{${name}\\}\\}`, 'g'), String(value))
    }

    // Detectar params sin resolver (no definidos)
    const unresolved = [...sql.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g)]
    unresolved.forEach(([, name]) => {
      errors.push(`Parámetro no definido: {{${name}}}`)
    })

    return { sql, params: resolved, errors }
  }
}

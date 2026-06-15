/**
 * MetricsRegistry — registro central de métricas y dimensiones reutilizables.
 *
 * Las métricas se definen como objetos JS (cargables desde YAML externo).
 * Ejemplo de uso:
 *   registry.addMetric({ name: 'revenue', label: 'Ingresos', expression: 'SUM(price * qty)' })
 *   registry.expandMetrics('SELECT {{revenue}} FROM ventas GROUP BY zona')
 *   → 'SELECT SUM(price * qty) AS revenue FROM ventas GROUP BY zona'
 */
import type { MetricDefinition, DimensionDefinition, MetricsRegistry as IRegistry } from './types'

export class MetricsRegistry {
  private metrics:    Map<string, MetricDefinition>    = new Map()
  private dimensions: Map<string, DimensionDefinition> = new Map()
  public  namespace:  string

  constructor(namespace: string = 'default') {
    this.namespace = namespace
  }

  // ── Registro ──────────────────────────────────────────────────────────────

  addMetric(def: MetricDefinition): this {
    this.metrics.set(def.name, def)
    return this
  }

  addDimension(def: DimensionDefinition): this {
    this.dimensions.set(def.name, def)
    return this
  }

  loadFromObject(registry: IRegistry): this {
    this.namespace = registry.namespace
    registry.metrics.forEach((m)    => this.addMetric(m))
    registry.dimensions.forEach((d) => this.addDimension(d))
    return this
  }

  // ── Consulta ──────────────────────────────────────────────────────────────

  getMetric(name: string): MetricDefinition | undefined {
    return this.metrics.get(name)
  }

  getDimension(name: string): DimensionDefinition | undefined {
    return this.dimensions.get(name)
  }

  listMetrics():    MetricDefinition[]    { return [...this.metrics.values()] }
  listDimensions(): DimensionDefinition[] { return [...this.dimensions.values()] }

  // ── Expansión de plantillas ────────────────────────────────────────────────
  /**
   * Expande {{metric_name}} en un SQL template con la expresión real.
   * {{revenue}} → SUM(price * qty) AS revenue
   * {{zona}}    → zona  (dimensión)
   *
   * No toca {{param_name}} — esos son responsabilidad de QueryParameterizer.
   */
  expandMetrics(template: string): { sql: string; unknowns: string[] } {
    const unknowns: string[] = []

    const sql = template.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (match, name) => {
      const metric = this.metrics.get(name)
      if (metric) return `${metric.expression} AS ${name}`

      const dim = this.dimensions.get(name)
      if (dim) return dim.field

      // No es métrica ni dimensión — puede ser un param, dejarlo
      return match
    })

    // Detectar {{...}} no resueltos que NO son params conocidos
    const remaining = [...sql.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g)]
    remaining.forEach(([, name]) => unknowns.push(name))

    return { sql, unknowns }
  }

  // ── Serialización ─────────────────────────────────────────────────────────
  toJSON(): IRegistry {
    return {
      namespace:  this.namespace,
      metrics:    this.listMetrics(),
      dimensions: this.listDimensions(),
    }
  }
}

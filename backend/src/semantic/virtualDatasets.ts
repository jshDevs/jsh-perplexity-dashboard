/**
 * VirtualDatasets — registry de datasets virtuales.
 *
 * Un VirtualDataset es una query SQL que actúa como fuente de datos
 * para un dashboard, pudiendo referenciar:
 *   1. Un dataset físico ingestado (sourceDatasetId en Redis)
 *   2. Una tabla registrada en DuckDB
 *   3. Otra query virtual (composición)
 *
 * Flujo:
 *   register(vd) → store en Map
 *   resolve(id, params) → SQL final listo para DuckDB
 */
import { MetricsRegistry }     from './metricsRegistry'
import { QueryParameterizer }  from './queryParameterizer'
import type { VirtualDataset, ResolvedQuery } from './types'

export class VirtualDatasets {
  private store: Map<string, VirtualDataset> = new Map()

  constructor(private registry?: MetricsRegistry) {}

  register(vd: VirtualDataset): this {
    this.store.set(vd.id, vd)
    return this
  }

  get(id: string): VirtualDataset | undefined {
    return this.store.get(id)
  }

  list(): VirtualDataset[] {
    return [...this.store.values()]
  }

  /**
   * Resuelve el SQL final de un VirtualDataset:
   *   1. Expande métricas si hay registry
   *   2. Inyecta parámetros de usuario
   */
  resolve(
    id:     string,
    values: Record<string, unknown> = {},
  ): ResolvedQuery & { sourceDatasetId?: string } {
    const vd = this.store.get(id)
    if (!vd) {
      return { sql: '', params: {}, errors: [`VirtualDataset "${id}" no encontrado`] }
    }

    // Paso 1: expandir métricas semánticas
    let template = vd.query
    if (this.registry) {
      const { sql, unknowns } = this.registry.expandMetrics(vd.query)
      template = sql
      // unknowns que no sean params son warnings — no bloqueantes
    }

    // Paso 2: inyectar parámetros
    const paramDefs    = vd.params ?? []
    const parameterizer = new QueryParameterizer(paramDefs)
    const resolved     = parameterizer.resolve(template, values)

    return { ...resolved, sourceDatasetId: vd.sourceDatasetId }
  }

  delete(id: string): boolean {
    return this.store.delete(id)
  }
}

/**
 * useInference — hook React que encapsula el pipeline completo:
 *   data[] → InferredSchema → RecommendedChart[]
 *
 * Memoizado: solo recalcula si cambia la referencia de data.
 */
import { useMemo } from 'react'
import { inferSchema } from './schemaInferrer'
import { selectCharts } from './chartSelector'
import type { InferredSchema, RecommendedChart } from './types'

interface UseInferenceResult {
  schema:          InferredSchema
  recommendations: RecommendedChart[]
  primaryChart:    RecommendedChart | null
  isReady:         boolean
}

export function useInference(
  data:       Record<string, unknown>[] | null | undefined,
  sampleSize?: number,
): UseInferenceResult {
  return useMemo(() => {
    if (!data || data.length === 0) {
      return {
        schema:          { fields: [], metrics: [], dimensions: [], timeFields: [], idFields: [], rowCount: 0, sampleSize: 0 },
        recommendations: [],
        primaryChart:    null,
        isReady:         false,
      }
    }

    const schema          = inferSchema(data, sampleSize)
    const recommendations = selectCharts(schema)
    const primaryChart    = recommendations[0] ?? null

    return { schema, recommendations, primaryChart, isReady: true }
  }, [data, sampleSize])
}

import { describe, it, expect } from 'vitest'
import { analyzeField } from '@/inference/fieldAnalyzer'
import { inferSchema }   from '@/inference/schemaInferrer'
import { selectCharts }  from '@/inference/chartSelector'

// ─────────────────────────── fieldAnalyzer ───────────────────────────────────
describe('analyzeField — METRIC detection', () => {
  it('campo numérico con nombre metric → METRIC', () => {
    const f = analyzeField('ventas', [100, 200, 150, 300, 250])
    expect(f.role).toBe('METRIC')
    expect(f.numericRatio).toBeCloseTo(1)
  })

  it('numericRatio < 0.85 con alta cardinalidad → TEXT', () => {
    const f = analyzeField('descripcion', ['foo','bar','baz','qux','lorem','ipsum'])
    expect(f.role).toBe('TEXT')
  })

  it('campo id detectado por sufijo → ID', () => {
    const f = analyzeField('user_id', [1,2,3,4,5])
    expect(f.role).toBe('ID')
  })

  it('campo fecha ISO → TIME', () => {
    const f = analyzeField('fecha', ['2024-01-01','2024-02-01','2024-03-01'])
    expect(f.role).toBe('TIME')
  })

  it('campo con nombre date → TIME', () => {
    const f = analyzeField('date', ['2024-01-01','2024-02-01'])
    expect(f.role).toBe('TIME')
  })

  it('campo booleano → BOOLEAN', () => {
    const f = analyzeField('activo', ['true','false','true','true','false'])
    expect(f.role).toBe('BOOLEAN')
  })

  it('baja cardinalidad string → DIMENSION', () => {
    const f = analyzeField('zona', ['Norte','Sur','Este','Norte','Sur','Este','Norte'])
    expect(f.role).toBe('DIMENSION')
  })

  it('calcula min/max/mean para campos numéricos', () => {
    const f = analyzeField('score', [10, 20, 30, 40, 50])
    expect(f.min).toBe(10)
    expect(f.max).toBe(50)
    expect(f.mean).toBe(30)
  })

  it('nullRatio correcto con valores nulos', () => {
    const f = analyzeField('valor', [1, null, 3, null, 5])
    expect(f.nullRatio).toBeCloseTo(0.4)
  })
})

// ─────────────────────────── schemaInferrer ───────────────────────────────────
describe('inferSchema', () => {
  const dataset = [
    { fecha: '2024-01', ventas: 1200, zona: 'Norte' },
    { fecha: '2024-02', ventas: 1500, zona: 'Sur' },
    { fecha: '2024-03', ventas: 900,  zona: 'Norte' },
    { fecha: '2024-04', ventas: 1800, zona: 'Este' },
  ]

  it('detecta campos correctamente', () => {
    const s = inferSchema(dataset)
    expect(s.fields).toHaveLength(3)
  })

  it('infiere fecha como TIME', () => {
    const s = inferSchema(dataset)
    expect(s.timeFields.map((f) => f.name)).toContain('fecha')
  })

  it('infiere ventas como METRIC', () => {
    const s = inferSchema(dataset)
    expect(s.metrics.map((f) => f.name)).toContain('ventas')
  })

  it('infiere zona como DIMENSION', () => {
    const s = inferSchema(dataset)
    expect(s.dimensions.map((f) => f.name)).toContain('zona')
  })

  it('rowCount = longitud original', () => {
    const s = inferSchema(dataset)
    expect(s.rowCount).toBe(4)
  })

  it('dataset vacío → schema vacío', () => {
    const s = inferSchema([])
    expect(s.fields).toHaveLength(0)
    expect(s.isReady).toBeFalsy()
  })
})

// ─────────────────────────── chartSelector ───────────────────────────────────
describe('selectCharts', () => {
  function makeSchema(overrides: Partial<import('@/inference/types').InferredSchema>) {
    return {
      fields: [], metrics: [], dimensions: [], timeFields: [], idFields: [],
      rowCount: 100, sampleSize: 100,
      ...overrides,
    } as import('@/inference/types').InferredSchema
  }

  function field(name: string, role: import('@/inference/types').FieldRole) {
    return {
      name, role, dtype: 'string' as const,
      nullRatio: 0, numericRatio: role === 'METRIC' ? 1 : 0,
      uniqueCount: role === 'DIMENSION' ? 5 : 50,
      totalCount: 100, cardinalityRatio: role === 'DIMENSION' ? 0.05 : 0.5,
      sampleValues: [],
    }
  }

  it('TIME + METRIC → primera recomendación es line', () => {
    const schema = makeSchema({
      fields:     [field('fecha','TIME'), field('ventas','METRIC')],
      timeFields: [field('fecha','TIME')],
      metrics:    [field('ventas','METRIC')],
    })
    const recs = selectCharts(schema)
    expect(recs[0].type).toBe('line')
  })

  it('DIMENSION + METRIC → incluye bar', () => {
    const schema = makeSchema({
      fields:      [field('zona','DIMENSION'), field('ventas','METRIC')],
      dimensions:  [field('zona','DIMENSION')],
      metrics:     [field('ventas','METRIC')],
    })
    const recs = selectCharts(schema)
    expect(recs.some((r) => r.type === 'bar')).toBe(true)
  })

  it('2 METRIC sin dim → scatter', () => {
    const schema = makeSchema({
      fields:  [field('x','METRIC'), field('y','METRIC')],
      metrics: [field('x','METRIC'), field('y','METRIC')],
    })
    const recs = selectCharts(schema)
    expect(recs.some((r) => r.type === 'scatter')).toBe(true)
  })

  it('≥4 METRIC → incluye splom', () => {
    const mets = ['a','b','c','d'].map((n) => field(n,'METRIC'))
    const schema = makeSchema({ fields: mets, metrics: mets })
    const recs = selectCharts(schema)
    expect(recs.some((r) => r.type === 'splom')).toBe(true)
  })

  it('DIMENSION pocas categorías → incluye pie o donut', () => {
    const dim = { ...field('estado','DIMENSION'), uniqueCount: 4 }
    const schema = makeSchema({
      fields:     [dim, field('total','METRIC')],
      dimensions: [dim],
      metrics:    [field('total','METRIC')],
    })
    const recs = selectCharts(schema)
    expect(recs.some((r) => r.type === 'pie' || r.type === 'donut')).toBe(true)
  })

  it('schema vacío → fallback bar', () => {
    const schema = makeSchema({})
    const recs = selectCharts(schema)
    expect(recs[0].type).toBe('bar')
  })

  it('confidence ordenado descendente', () => {
    const schema = makeSchema({
      fields:     [field('fecha','TIME'), field('ventas','METRIC')],
      timeFields: [field('fecha','TIME')],
      metrics:    [field('ventas','METRIC')],
    })
    const recs = selectCharts(schema)
    for (let i = 0; i < recs.length - 1; i++) {
      expect(recs[i].confidence).toBeGreaterThanOrEqual(recs[i+1].confidence)
    }
  })

  it('BOOLEAN + METRIC → waffle', () => {
    const bool = { ...field('activo','BOOLEAN'), uniqueCount: 2 }
    const schema = makeSchema({
      fields:  [bool, field('cantidad','METRIC')],
      metrics: [field('cantidad','METRIC')],
    })
    const recs = selectCharts(schema)
    expect(recs.some((r) => r.type === 'waffle')).toBe(true)
  })
})

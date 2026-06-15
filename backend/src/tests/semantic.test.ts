import { describe, it, expect, beforeEach } from 'vitest'
import { MetricsRegistry }    from '../semantic/metricsRegistry'
import { QueryParameterizer } from '../semantic/queryParameterizer'
import { VirtualDatasets }    from '../semantic/virtualDatasets'

// ─── MetricsRegistry ─────────────────────────────────────────────────────────
describe('MetricsRegistry', () => {
  let reg: MetricsRegistry

  beforeEach(() => {
    reg = new MetricsRegistry('ventas')
    reg.addMetric({ name: 'revenue',  label: 'Ingresos', expression: 'SUM(price * qty)' })
    reg.addMetric({ name: 'avg_ticket', label: 'Ticket promedio', expression: 'AVG(price)' })
    reg.addDimension({ name: 'zona', label: 'Zona', field: 'zona_id', type: 'categorical' })
  })

  it('registra y recupera métricas', () => {
    expect(reg.getMetric('revenue')?.expression).toBe('SUM(price * qty)')
    expect(reg.getMetric('nonexistent')).toBeUndefined()
  })

  it('listMetrics devuelve todas las métricas', () => {
    expect(reg.listMetrics().length).toBe(2)
  })

  it('expande {{metric}} en SQL template', () => {
    const { sql } = reg.expandMetrics('SELECT {{revenue}} FROM ventas GROUP BY zona_id')
    expect(sql).toContain('SUM(price * qty) AS revenue')
  })

  it('expande {{dimension}} en SQL template', () => {
    const { sql } = reg.expandMetrics('SELECT {{zona}} FROM ventas')
    expect(sql).toContain('zona_id')
  })

  it('deja {{param}} no registrado intacto', () => {
    const { sql, unknowns } = reg.expandMetrics('SELECT {{revenue}} WHERE fecha > {{fecha_inicio}}')
    expect(sql).toContain('{{fecha_inicio}}')   // param no resuelto
    expect(unknowns).toContain('fecha_inicio')
  })

  it('loadFromObject carga namespace + métricas + dimensiones', () => {
    const reg2 = new MetricsRegistry()
    reg2.loadFromObject(reg.toJSON())
    expect(reg2.namespace).toBe('ventas')
    expect(reg2.listMetrics().length).toBe(2)
  })

  it('toJSON serializa correctamente', () => {
    const json = reg.toJSON()
    expect(json.namespace).toBe('ventas')
    expect(json.metrics.length).toBe(2)
    expect(json.dimensions.length).toBe(1)
  })
})

// ─── QueryParameterizer ───────────────────────────────────────────────────────
describe('QueryParameterizer', () => {
  it('inyecta string escapado', () => {
    const p = new QueryParameterizer([{ name: 'zona', type: 'string' }])
    const { sql, errors } = p.resolve('SELECT * FROM t WHERE zona = {{zona}}', { zona: 'Norte' })
    expect(sql).toBe("SELECT * FROM t WHERE zona = 'Norte'")
    expect(errors).toHaveLength(0)
  })

  it('escapa comillas simples en strings', () => {
    const p = new QueryParameterizer([{ name: 'nombre', type: 'string' }])
    const { sql } = p.resolve('SELECT * FROM t WHERE nombre = {{nombre}}', { nombre: "O'Brien" })
    expect(sql).toContain("O''Brien")
  })

  it('inyecta número validado', () => {
    const p = new QueryParameterizer([{ name: 'limite', type: 'number' }])
    const { sql, errors } = p.resolve('SELECT * FROM t LIMIT {{limite}}', { limite: 100 })
    expect(sql).toBe('SELECT * FROM t LIMIT 100')
    expect(errors).toHaveLength(0)
  })

  it('falla con número inválido', () => {
    const p = new QueryParameterizer([{ name: 'n', type: 'number' }])
    const { errors } = p.resolve('SELECT {{n}}', { n: 'abc' })
    expect(errors.some((e) => e.includes('numérico'))).toBe(true)
  })

  it('inyecta fecha ISO válida', () => {
    const p = new QueryParameterizer([{ name: 'fecha', type: 'date' }])
    const { sql, errors } = p.resolve('WHERE fecha > {{fecha}}', { fecha: '2024-01-15' })
    expect(sql).toContain("'2024-01-15'")
    expect(errors).toHaveLength(0)
  })

  it('falla con fecha inválida', () => {
    const p = new QueryParameterizer([{ name: 'fecha', type: 'date' }])
    const { errors } = p.resolve('WHERE fecha > {{fecha}}', { fecha: '15/01/2024' })
    expect(errors.some((e) => e.includes('YYYY-MM-DD'))).toBe(true)
  })

  it('usa default si no se proporciona valor', () => {
    const p = new QueryParameterizer([{ name: 'limit', type: 'number', default: 50 }])
    const { sql } = p.resolve('LIMIT {{limit}}', {})
    expect(sql).toBe('LIMIT 50')
  })

  it('error si param required falta', () => {
    const p = new QueryParameterizer([{ name: 'user_id', type: 'number', required: true }])
    const { errors } = p.resolve('WHERE id = {{user_id}}', {})
    expect(errors.some((e) => e.includes('requerido'))).toBe(true)
  })

  it('inyecta boolean como TRUE/FALSE literal SQL', () => {
    const p = new QueryParameterizer([{ name: 'activo', type: 'boolean' }])
    const { sql } = p.resolve('WHERE activo = {{activo}}', { activo: true })
    expect(sql).toContain('TRUE')
  })
})

// ─── VirtualDatasets ─────────────────────────────────────────────────────────
describe('VirtualDatasets', () => {
  let reg: MetricsRegistry
  let vds: VirtualDatasets

  beforeEach(() => {
    reg = new MetricsRegistry('test')
    reg.addMetric({ name: 'total', label: 'Total', expression: 'SUM(amount)' })
    vds = new VirtualDatasets(reg)
  })

  it('registra y recupera virtual dataset', () => {
    vds.register({ id: 'vd1', label: 'Test', query: 'SELECT {{total}} FROM dataset' })
    expect(vds.get('vd1')?.id).toBe('vd1')
  })

  it('resolve expande métricas y parámetros', () => {
    vds.register({
      id:    'vd2',
      label: 'Filtrado',
      query: 'SELECT {{total}} FROM dataset WHERE fecha > {{fecha_inicio}}',
      params: [{ name: 'fecha_inicio', type: 'date' }],
    })
    const { sql, errors } = vds.resolve('vd2', { fecha_inicio: '2024-01-01' })
    expect(sql).toContain('SUM(amount) AS total')
    expect(sql).toContain("'2024-01-01'")
    expect(errors).toHaveLength(0)
  })

  it('retorna error para id inexistente', () => {
    const { errors } = vds.resolve('nonexistent')
    expect(errors.some((e) => e.includes('no encontrado'))).toBe(true)
  })

  it('list devuelve todos los datasets registrados', () => {
    vds.register({ id: 'a', label: 'A', query: 'SELECT 1' })
    vds.register({ id: 'b', label: 'B', query: 'SELECT 2' })
    expect(vds.list().length).toBe(2)
  })

  it('delete elimina el virtual dataset', () => {
    vds.register({ id: 'del', label: 'Del', query: 'SELECT 1' })
    vds.delete('del')
    expect(vds.get('del')).toBeUndefined()
  })
})

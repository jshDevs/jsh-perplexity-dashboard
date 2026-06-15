import { test, expect } from '@playwright/test'
import { Pool } from 'pg'
import { runMigrations } from '../../backend/src/db/migrate'

/**
 * E2E — Migraciones PostgreSQL
 * Smoke test: verifica que las migraciones corren sin error
 * y las tablas existen en la DB.
 */
test.describe('PostgreSQL Migrations', () => {
  let pool: Pool

  test.beforeAll(async () => {
    pool = new Pool({
      host:     process.env.PG_HOST     ?? 'localhost',
      port:     Number(process.env.PG_PORT ?? 5432),
      database: process.env.PG_DB       ?? 'jsh_dashboard',
      user:     process.env.PG_USER     ?? 'jsh',
      password: process.env.PG_PASS     ?? 'jsh_secret',
    })
  })

  test.afterAll(async () => {
    await pool.end()
  })

  test('runMigrations crea tabla datasets', async () => {
    await runMigrations(pool)
    const { rows } = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'datasets'
    `)
    expect(rows.length).toBe(1)
  })

  test('runMigrations crea tabla dashboard_configs', async () => {
    await runMigrations(pool)
    const { rows } = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'dashboard_configs'
    `)
    expect(rows.length).toBe(1)
  })

  test('runMigrations es idempotente (segunda ejecución sin error)', async () => {
    await expect(runMigrations(pool)).resolves.not.toThrow()
  })

  test('tabla _migrations registra archivos aplicados', async () => {
    const { rows } = await pool.query('SELECT filename FROM _migrations ORDER BY filename')
    const filenames = rows.map((r: any) => r.filename)
    expect(filenames).toContain('001_datasets.sql')
    expect(filenames).toContain('002_dashboard_configs.sql')
  })
})

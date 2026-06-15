/**
 * migrate.ts — runner de migraciones SQL secuenciales.
 * Lee archivos *.sql del directorio migrations/ en orden lexicográfico.
 * Lleva un tracking en la tabla _migrations para no re-ejecutar.
 *
 * Uso: node -e "require('./migrate').runMigrations(pool)"
 * O desde el entrypoint del backend al arrancar.
 */
import { readdir, readFile } from 'fs/promises'
import { join }              from 'path'
import type { Pool }         from 'pg'

const MIGRATIONS_DIR = join(__dirname, 'migrations')

export async function runMigrations(pool: Pool): Promise<void> {
  // Crear tabla de tracking si no existe
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          SERIAL PRIMARY KEY,
      filename    VARCHAR(255) UNIQUE NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const { rows } = await pool.query(
      'SELECT id FROM _migrations WHERE filename = $1',
      [file]
    )
    if (rows.length > 0) continue  // ya aplicada

    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8')
    await pool.query(sql)
    await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [file])
    console.log(`[migrate] ✓ ${file}`)
  }
}

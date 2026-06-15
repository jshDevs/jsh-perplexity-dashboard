/**
 * DashboardRepository — CRUD de dashboard_configs en PostgreSQL.
 * Espejo persistente de lo que Redis guarda con TTL.
 */
import type { Pool }           from 'pg'
import type { DashboardConfig } from '../../frontend/src/store/dashboardStore'

export interface DashboardRecord {
  id:        string
  name:      string
  ownerId:   string | null
  itemsJson: DashboardConfig['items']
  itemCount: number
  isPublic:  boolean
  createdAt: string
  updatedAt: string
}

function toRecord(row: any): DashboardRecord {
  return {
    id:        row.id,
    name:      row.name,
    ownerId:   row.owner_id,
    itemsJson: row.items_json,
    itemCount: row.item_count,
    isPublic:  row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class DashboardRepository {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<DashboardRecord | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM dashboard_configs WHERE id = $1',
      [id]
    )
    return rows.length ? toRecord(rows[0]) : null
  }

  async findByOwner(ownerId: string): Promise<DashboardRecord[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM dashboard_configs WHERE owner_id = $1 ORDER BY updated_at DESC',
      [ownerId]
    )
    return rows.map(toRecord)
  }

  async findPublic(): Promise<DashboardRecord[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM dashboard_configs WHERE is_public = TRUE ORDER BY updated_at DESC'
    )
    return rows.map(toRecord)
  }

  async upsert(config: DashboardConfig, ownerId?: string): Promise<DashboardRecord> {
    const { rows } = await this.pool.query(
      `INSERT INTO dashboard_configs
         (id, name, owner_id, items_json, item_count, is_public)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET
         name       = EXCLUDED.name,
         owner_id   = COALESCE(EXCLUDED.owner_id, dashboard_configs.owner_id),
         items_json = EXCLUDED.items_json,
         item_count = EXCLUDED.item_count
       RETURNING *`,
      [
        config.id,
        config.name,
        ownerId ?? null,
        JSON.stringify(config.items),
        config.items.length,
        false,
      ]
    )
    return toRecord(rows[0])
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM dashboard_configs WHERE id = $1', [id])
  }

  async setPublic(id: string, isPublic: boolean): Promise<void> {
    await this.pool.query(
      'UPDATE dashboard_configs SET is_public = $1 WHERE id = $2',
      [isPublic, id]
    )
  }

  async count(): Promise<number> {
    const { rows } = await this.pool.query('SELECT COUNT(*)::int AS n FROM dashboard_configs')
    return rows[0].n
  }
}

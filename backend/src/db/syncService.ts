/**
 * syncService.ts — sincronización Redis → PostgreSQL en background.
 *
 * Estrategia dual-write:
 *   1. Las escrituras primarias van a Redis (rápido, TTL 7 días).
 *   2. syncService sincroniza a PostgreSQL de forma asíncrona.
 *      Si PG está caído, Redis mantiene disponibilidad.
 *
 * También expone syncFromRedis() para recuperar datos de Redis
 * hacia PG en caso de restart del servicio.
 */
import type { Pool }              from 'pg'
import { DashboardRepository }   from './DashboardRepository'
import type { DashboardConfig }  from '../../frontend/src/store/dashboardStore'

export class SyncService {
  private dashRepo: DashboardRepository

  constructor(
    private pool:  Pool,
    private redis: any,
  ) {
    this.dashRepo = new DashboardRepository(pool)
  }

  /**
   * Dual-write: guarda en Redis (primario) y PG (secundario).
   * Si PG falla, la escritura en Redis ya se hizo — no lanza.
   */
  async saveDashboard(config: DashboardConfig, ownerId?: string): Promise<void> {
    // 1. Redis (primario)
    const DASH_TTL = 60 * 60 * 24 * 7
    await this.redis.set(
      `dashboard:${config.id}`,
      JSON.stringify(config),
      { EX: DASH_TTL }
    )
    // 2. PostgreSQL (secundario, best-effort)
    this.dashRepo.upsert(config, ownerId).catch((err: Error) => {
      console.warn('[sync] PG upsert failed (non-fatal):', err.message)
    })
  }

  /**
   * Recupera todos los dashboards de Redis y los sincroniza a PG.
   * Útil al arrancar si PG tuvo downtime.
   */
  async syncFromRedis(): Promise<number> {
    const keys = await this.redis.keys('dashboard:*')
    let synced = 0
    for (const key of keys) {
      try {
        const raw = await this.redis.get(key)
        if (!raw) continue
        const config: DashboardConfig = JSON.parse(raw)
        await this.dashRepo.upsert(config)
        synced++
      } catch { /* continuar con el siguiente */ }
    }
    return synced
  }

  /**
   * Recupera un dashboard: Redis primero, PG como fallback.
   */
  async getDashboard(id: string): Promise<DashboardConfig | null> {
    // Redis first
    const raw = await this.redis.get(`dashboard:${id}`)
    if (raw) return JSON.parse(raw)
    // PG fallback
    const record = await this.dashRepo.findById(id)
    if (!record) return null
    // Re-hidratar Redis si encontramos en PG
    const config = {
      id: record.id,
      name: record.name,
      items: record.itemsJson,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    } as DashboardConfig
    await this.redis.set(`dashboard:${id}`, JSON.stringify(config), { EX: 60 * 60 * 24 })
    return config
  }

  /**
   * Elimina de Redis y PG.
   */
  async deleteDashboard(id: string): Promise<void> {
    await Promise.allSettled([
      this.redis.del(`dashboard:${id}`),
      this.dashRepo.delete(id),
    ])
  }
}

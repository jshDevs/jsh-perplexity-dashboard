import { DuckDBInstance } from '@duckdb/node-api'

class DuckDBService {
  private instance: Awaited<ReturnType<typeof DuckDBInstance.create>> | null = null
  private conn: Awaited<ReturnType<typeof this.instance.connect>> | null = null

  async init(): Promise<void> {
    this.instance = await DuckDBInstance.create(':memory:', {
      threads:    process.env.DUCKDB_THREADS  ?? '4',
      memory_limit: process.env.DUCKDB_MAX_MEMORY ?? '1GB',
    })
    this.conn = await this.instance.connect()
    // Install and load extensions (offline-first: pre-bundled in image)
    try {
      await this.conn.run("INSTALL httpfs; LOAD httpfs;")
      await this.conn.run("INSTALL json; LOAD json;")
      await this.conn.run("INSTALL excel; LOAD excel;")
    } catch {
      // Extensions optional — CSV and Parquet work without them
    }
    console.log('[duckdb] initialized with @duckdb/node-api')
  }

  async query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
    if (!this.conn) await this.init()

    // SELECT-only whitelist for safety
    const normalized = sql.trim().replace(/\s+/g, ' ').toUpperCase()
    const ALLOWED_PREFIXES = ['SELECT', 'WITH', 'FROM', 'SHOW', 'DESCRIBE', 'EXPLAIN']
    if (!ALLOWED_PREFIXES.some((p) => normalized.startsWith(p))) {
      throw new Error(`Only SELECT queries are allowed. Got: ${normalized.slice(0, 40)}`)
    }

    const result = await this.conn!.runAndReadAll(sql)
    return result.getRowObjects() as T[]
  }

  async queryStream(sql: string, chunkSize = 1000): AsyncGenerator<Record<string, unknown>[]> {
    if (!this.conn) await this.init()
    // Streaming implementation via OFFSET pagination
    let offset = 0
    while (true) {
      const chunk = await this.query<Record<string, unknown>>(
        `SELECT * FROM (${sql}) __stream LIMIT ${chunkSize} OFFSET ${offset}`
      )
      if (!chunk.length) break
      yield chunk
      offset += chunkSize
      if (chunk.length < chunkSize) break
    }
  }
}

export const duckdb = new DuckDBService()

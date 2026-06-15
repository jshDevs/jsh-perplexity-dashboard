/**
 * duckdb-server.mjs — microservicio HTTP minimalista para DuckDB.
 * Expone POST /query y GET /health.
 * Se ejecuta como sidecar en Docker junto al backend Hono.
 *
 * Requisito: duckdb npm package instalado en el contenedor.
 * Imagen: node:22-alpine + npm install duckdb
 */
import { createServer }   from 'http'
import { Database }        from 'duckdb'
import { readFileSync }    from 'fs'

const PORT    = parseInt(process.env.PORT ?? '8080')
const db      = new Database(':memory:')
const conn    = db.connect()

function query(sql) {
  return new Promise((resolve, reject) => {
    conn.all(sql, (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  // ── Health
  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('ok')
    return
  }

  // ── Query
  if (req.method === 'POST' && url.pathname === '/query') {
    let body = ''
    req.on('data', (d) => { body += d })
    req.on('end', async () => {
      try {
        const { sql } = JSON.parse(body)
        if (!sql || typeof sql !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'sql requerido' }))
          return
        }
        const rows = await query(sql)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ rows, rowCount: rows.length }))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
    })
    return
  }

  res.writeHead(404)
  res.end()
})

server.listen(PORT, () => {
  console.log(`DuckDB sidecar escuchando en :${PORT}`)
})

# JSH Dashboard — Arquitectura v2 (100% JavaScript)

## Decisión de arquitectura: Laravel → Hono (Node.js)

### Razón principal
El motor de inteligencia (`jshDevs/dashboard/engine/`) está escrito en ES Modules
puros. Mantener Laravel obligaba a reimplementar 9 módulos JS a PHP, incluyendo:
- `analyze()` — orquestador principal
- `insights.js` — narrativa automática por plantillas
- `geoJoin.js` — join territorial El Salvador (262 distritos)
- `timeIntelligence.js` — equivalente DAX (presets, comparación períodos)
- `population.js` — tasa por 100k habitantes
- `maskPII()` — enmascaramiento de datos sensibles

Con Node.js, todos se importan directamente. Zero reescritura.

## Stack definitivo

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser — React 18 + TypeScript + Vite                          │
│  ECharts 5 · TanStack Table v8 · Zustand · Tailwind CSS v4       │
└──────────────────────┬───────────────────────────────────────────┘
                       │ HTTP/REST + WebSocket
┌──────────────────────▼───────────────────────────────────────────┐
│  API — Hono v4 (Node.js 22, TypeScript)                          │
│  ├── /api/analyze     → engine/index.js (analyze)               │
│  ├── /api/ingest      → papaparse + xlsx + DuckDB               │
│  ├── /api/dashboards  → YAML loader + DuckDB query              │
│  ├── /api/anomalies   → engine/statistics.js                    │
│  ├── /api/forecast    → holt-winters.ts (TS puro)               │
│  └── ws://            → @hono/node-ws (WebSocket)               │
├─────────────────────────────────────────────────────────────────┤
│  engine/ (jshDevs/dashboard — importado directamente)           │
│  analyze · schemaInference · chartRecommender · insights        │
│  geoJoin · timeIntelligence · population · policeDomain · stats  │
├─────────────────────────────────────────────────────────────────┤
│  DuckDB (@duckdb/node-api v1.1+)                                │
│  → CSV / Parquet / JSON / XLSX hasta 2GB con SQL analítico      │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL 16   — metadata, dashboards YAML, audit log         │
│  Redis 7         — cache de resultados, sesiones                │
└─────────────────────────────────────────────────────────────────┘
```

## Estructura de directorios

```
jsh-perplexity-dashboard/
├── backend/                     # Hono API (Node.js 22, TypeScript)
│   ├── src/
│   │   ├── app.ts               # Hono app + middleware
│   │   ├── routes/
│   │   │   ├── analyze.ts       # POST /api/analyze → engine
│   │   │   ├── dashboards.ts    # CRUD dashboards
│   │   │   ├── ingest.ts        # Upload + DuckDB
│   │   │   ├── schema.ts        # Schema inference
│   │   │   └── ws.ts            # WebSocket handlers
│   │   ├── services/
│   │   │   ├── duckdb.ts        # @duckdb/node-api wrapper
│   │   │   ├── redis.ts         # ioredis wrapper
│   │   │   ├── security.ts      # MIME, zip-bomb, CSV injection
│   │   │   └── forecast.ts      # Holt-Winters TS
│   │   └── engine/              # git subtree jshDevs/dashboard/engine
│   │       ├── index.js
│   │       ├── schemaInference.js
│   │       ├── chartRecommender.js
│   │       ├── insights.js
│   │       ├── geoJoin.js
│   │       ├── timeIntelligence.js
│   │       ├── population.js
│   │       ├── policeDomain.js
│   │       └── statistics.js
│   ├── maps/sv/                 # GeoJSON El Salvador
│   ├── dashboards/              # YAML configs
│   ├── package.json
│   └── Dockerfile
├── frontend/                    # React 18 (sin cambios)
├── nginx/
├── docker-compose.yml
└── Makefile
```

## Comparativa de recursos Docker

| Servicio | Laravel stack | Node.js stack |
|---------|--------------|---------------|
| Backend image | ~450 MB | ~120 MB |
| Boot time | ~3s | ~200ms |
| Memoria idle | ~180 MB | ~60 MB |
| Contenedores totales | 6 | 5 (sin PHP-FPM) |

## Módulos del engine integrados (sin reescritura)

| Módulo | Función | Origen |
|--------|---------|--------|
| `analyze()` | Orquestador completo | jshDevs/dashboard |
| `schemaInference` | Tipos + confidence score | jshDevs/dashboard |
| `chartRecommender` | Árbol chart selection | jshDevs/dashboard |
| `insights` | Narrativa automática | jshDevs/dashboard |
| `geoJoin` | Territorios SV 262 distritos | jshDevs/dashboard |
| `timeIntelligence` | DAX equivalente | jshDevs/dashboard |
| `population` | Tasa /100k habitantes | jshDevs/dashboard |
| `policeDomain` | Diccionario policial SV | jshDevs/dashboard |
| `statistics` | IQR, Z-score, CUSUM, MA | jshDevs/dashboard |
| `maskPII` | Enmascaramiento PII | jshDevs/dashboard |
| `HoltWintersForecast` | Triple exp. smoothing | jsh-perplexity-dashboard |

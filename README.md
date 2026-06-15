# JSH Dashboard

> **Sistema de dashboards dinámicos auto-generados** — Self-hosted · Offline-first · Sin LLM · Containerizado con Docker Compose.

[![Tests](https://img.shields.io/badge/tests-279%20passing-brightgreen)](#testing)
[![Stack](https://img.shields.io/badge/stack-React%2018%20%2B%20Hono%20%2B%20DuckDB-blue)](#stack)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## ¿Qué es?

JSH Dashboard interpreta automáticamente **JSON**, **CSV**, **Excel/.xlsx** y queries **SQL** — infiere su estructura, detecta métricas/dimensiones/series temporales y genera dashboards interactivos sin que el usuario toque código. Sin Power BI. Sin LLM en runtime. Sin dependencias cloud.

---

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Gráficas | Apache ECharts 5 (Canvas / SVG) |
| Tablas | TanStack Table v8 |
| Estado global | Zustand 4 (`subscribeWithSelector`) |
| Estilos | Tailwind CSS v4 |
| Backend API | Hono (Node 22 — HTTP + WebSocket nativo) |
| Auth | JWT HS256 (`jose`) + bcryptjs · RBAC viewer/editor/admin |
| Motor analítico | DuckDB 1.1+ (consultas directas CSV/JSON/Parquet) |
| Cache / sesiones | Redis 7 |
| Persistencia | PostgreSQL 16 (migraciones SQL, dual-write) |
| Tiempo real | WebSocket nativo Hono + `useRealtimeDataset` hook |
| Export | PNG (ECharts canvas) · PDF (html2canvas + jsPDF) · CSV · Excel (SheetJS) |
| Contenedores | Docker Compose (prod + dev) con nginx reverse proxy |
| Tests unitarios | Vitest — 256 tests |
| Tests E2E | Playwright — 23 tests |

---

## Quick Start

```bash
# 1. Clonar
git clone https://github.com/jshDevs/jsh-perplexity-dashboard.git
cd jsh-perplexity-dashboard

# 2. Variables de entorno
cp .env.example .env
# Editar .env: JWT_SECRET, PG_PASS, REDIS_PASS

# 3. Levantar stack completo (prod)
docker compose -f docker-compose.prod.yml up -d

# 4. Verificar health
docker compose -f docker-compose.prod.yml ps

# 5. Abrir
open http://localhost
```

**Usuarios de demo (seeded automáticamente):**

| Email | Password | Rol |
|-------|----------|-----|
| `admin@jsh.local` | `password123` | admin |
| `editor@jsh.local` | `password123` | editor |
| `viewer@jsh.local` | `password123` | viewer |

---

## Arquitectura

```
jsh-perplexity-dashboard/
├── backend/
│   └── src/
│       ├── auth/
│       │   ├── authService.ts        # JWT sign/verify/rotate (jose)
│       │   ├── authMiddleware.ts     # Hono requireAuth + requireRole
│       │   └── authRoutes.ts        # POST /login /refresh /logout, GET /me
│       ├── db/
│       │   ├── migrations/
│       │   │   ├── 001_datasets.sql
│       │   │   └── 002_dashboard_configs.sql
│       │   ├── migrate.ts            # Runner secuencial idempotente
│       │   ├── DatasetRepository.ts  # CRUD datasets en PG
│       │   ├── DashboardRepository.ts
│       │   └── syncService.ts        # Dual-write Redis → PG + fallback
│       ├── inference/
│       │   ├── schemaInference.ts    # METRIC/DIMENSION/TIME/ID/TEXT
│       │   └── chartSelector.ts     # Árbol de decisión O(1), 7 nodos
│       ├── analytics/
│       │   ├── anomalyDetector.ts   # IQR, Z-score, Modified Z-score, CUSUM
│       │   └── forecaster.ts        # SMA, ETS, Holt-Winters
│       ├── ingest/
│       │   ├── ingestService.ts     # CSV/JSON/Excel → DuckDB + Redis
│       │   └── duckdbService.ts     # DuckDB WASM / CLI bridge
│       ├── routes/
│       │   ├── ingestRoute.ts
│       │   ├── dashboardsRoute.ts
│       │   └── datasetsRoute.ts
│       └── ws/
│           └── wsServer.ts          # WebSocket: subscribe/broadcast/ping
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── DynamicChart.tsx     # ECharts wrapper auto-tipo
│       │   ├── ChartCard.tsx        # Card con resize/rename/pin/remove
│       │   ├── DataTable.tsx        # TanStack Table v8
│       │   ├── FilterPanel.tsx      # Cross-filtering bidireccional
│       │   ├── ExportMenu.tsx       # PNG · PDF · CSV · Excel dropdown
│       │   ├── RealtimeBadge.tsx    # Estado WS (En vivo / Reconectando)
│       │   ├── AuthGuard.tsx        # Redirect /login si no autenticado
│       │   └── RoleGate.tsx         # Render condicional por rol
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── InferredDashboardPage.tsx
│       │   └── DashboardBuilderPage.tsx
│       ├── store/
│       │   ├── authStore.ts         # JWT persist + axios interceptors
│       │   ├── dashboardStore.ts    # Layouts + items
│       │   ├── filterStore.ts       # Cross-filter global
│       │   └── exportStore.ts       # Cola de exportaciones
│       └── export/
│           ├── exportService.ts     # PNG/PDF/CSV/XLSX
│           └── useExport.ts         # Hook: png/pdf/csv/xlsx
│
├── tests/
│   ├── e2e/                         # Playwright E2E (23 tests)
│   │   ├── auth.spec.ts
│   │   ├── infer.spec.ts
│   │   ├── builder.spec.ts
│   │   ├── export.spec.ts
│   │   ├── realtime.spec.ts
│   │   ├── rbac.spec.ts
│   │   └── migration.spec.ts
│   └── fixtures/
│       ├── sales.csv
│       └── orders.json
│
├── nginx/
├── docker-compose.prod.yml
├── docker-compose.yml
└── playwright.config.ts
```

---

## Características

### 🔍 Inferencia automática de schema (sin LLM)
- Detecta **METRIC**, **DIMENSION**, **TIME**, **ID**, **TEXT** por análisis estadístico (ratio numérico, cardinalidad, patrones de nombre)
- Soporta JSON plano y anidado (flattening automático), CSV, Excel multi-hoja
- Selección automática de tipo de gráfica: árbol de decisión determinista de 7 nodos, O(1)

### 📊 Dashboard Builder
- Drag-and-drop de items con `react-grid-layout`
- Resize, rename, pin, remove por chart
- Guardado dual Redis + PostgreSQL con sincronización asíncrona

### ⚡ Tiempo real
- WebSocket nativo con backoff exponencial (1s → 30s)
- `RealtimeBadge` con 4 estados visuales
- Append/replace de filas sin duplicados (dedup por `_id`)

### 🔐 Auth + RBAC
- JWT HS256 (access 15 min, refresh 7 días con rotation)
- 3 roles jerárquicos: `viewer` → `editor` → `admin`
- Axios interceptor automático para renovar token en 401

### 📤 Export
- **PNG**: ECharts `getDataURL()` a 2x, fondo dark
- **PDF**: html2canvas + jsPDF (lazy import, offline)
- **CSV**: RFC 4180 con escape completo
- **Excel**: SheetJS (Apache-2.0), soporte multi-hoja

### 📈 Analytics estadístico (sin ML)
- **Anomalías**: IQR, Z-score, Modified Z-score (MAD), CUSUM
- **Forecasting**: SMA, ETS (Simple Exponential Smoothing), Holt-Winters (triple)
- Implementados en TypeScript puro — sin dependencias Python

### 🛡️ Seguridad (DevSecOps)
- Validación MIME real (`file-type`), no por extensión
- Anti-zip-bomb (ratio de compresión > 100x rechazado)
- CSV formula injection sanitizer (prefijos `=`, `+`, `-`, `@`)
- SQL whitelist via AST — solo SELECT permitido

---

## Testing

```bash
# Tests unitarios (Vitest) — 256 tests
npm run test                    # modo watch
npm run test:run                # una ejecución

# Tests E2E (Playwright) — 23 tests
# Requiere stack Docker levantado
npx playwright test

# Solo una suite E2E
npx playwright test tests/e2e/auth.spec.ts

# Report HTML
npx playwright show-report

# Contra Vite dev (sin Docker)
E2E_SKIP_SERVER=1 npx playwright test
```

### Cobertura por bloque

| Bloque | Descripción | Tests |
|--------|-------------|-------|
| B1–B5 | Schema Inference + Ingest + ECharts + Cross-filter | 133 |
| B6 | Anomaly Detection (IQR, Z-score, CUSUM) | 22 |
| B7 | Forecast (SMA / ETS / Holt-Winters) | 18 |
| B8 | WebSocket Realtime | 14 |
| B9 | Dashboard Builder | 31 |
| B11 | Auth + RBAC JWT | 13 |
| B12 | Export PNG/PDF/CSV/XLSX | 11 |
| B13 | PostgreSQL Repositories | 14 |
| B14 | E2E Playwright | 23 |
| **Total** | | **279** |

---

## Variables de entorno

```env
# JWT
JWT_SECRET=cambia-esto-en-produccion-minimo-32-chars

# PostgreSQL
PG_HOST=postgres
PG_PORT=5432
PG_DB=jsh_dashboard
PG_USER=jsh
PG_PASS=jsh_secret

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASS=redis_secret

# Backend
PORT=3000
NODE_ENV=production

# Frontend (Vite)
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

---

## Roadmap

- [x] B1–B5 Schema Inference + Ingest + ECharts + Cross-filter + Anomaly
- [x] B6 Anomaly Detection (IQR / Z-score / CUSUM)
- [x] B7 Forecasting (SMA / ETS / Holt-Winters)
- [x] B8 WebSocket Realtime
- [x] B9 Dashboard Builder (drag-and-drop)
- [x] B10 Docker Compose producción
- [x] B11 Auth JWT + RBAC
- [x] B12 Export PNG / PDF / CSV / Excel
- [x] B13 PostgreSQL persistence + migraciones
- [x] B14 E2E Playwright
- [ ] Admin panel (gestión de usuarios)
- [ ] Scheduled reports (cron + PDF email)
- [ ] DuckDB WASM en frontend (queries client-side)
- [ ] Multi-tenant (namespaces por organización)

---

## Licencia

MIT — © 2026 Jorge Salazar ([@jshDevs](https://github.com/jshDevs))

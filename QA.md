# QA Report — JSH Dashboard v2

## Cobertura de tests

### Backend (Vitest — Node.js)

| Suite | Archivo | Casos |
|-------|---------|-------|
| Hono app bootstrap | `hono-app.test.ts` | 3 |
| Routes — analyze | `routes.test.ts` | 7 |
| Routes — schema | `schema-route.test.ts` | 4 |
| Routes — ingest | `ingest.test.ts` | 5 |
| DuckDB service | `duckdb.test.ts` | 5 |
| Security validator | `security.test.ts` | 5 |
| Forecast (Holt-Winters) | `forecast.test.ts` | 4 |
| **Total** | | **33** |

### Frontend (Vitest + Testing Library)

| Suite | Archivo | Casos |
|-------|---------|-------|
| KPICard | `components.test.tsx` | 5 |
| DataTable | `components.test.tsx` | 5 |
| InsightsPanel | `components.test.tsx` | 4 |
| FilterPanel | `filterPanel.test.tsx` | 4 |
| TimeIntelligenceBar | `timeIntelligence.test.tsx` | 4 |
| Zustand store | `store.test.ts` | 8 |
| Utilities | `utils.test.ts` | 4 |
| API client | `api.test.ts` | 4 |
| **Total** | | **38** |

**Total general: 71 casos de test**

## Cobertura mínima configurada

```
lines:      70%
functions:  70%
branches:   60%
statements: 70%
```

## CI/CD Pipeline (.github/workflows/ci.yml)

| Job | Qué hace |
|-----|----------|
| `backend-test` | tsc --noEmit + ESLint + Vitest coverage |
| `frontend-test` | tsc --noEmit + ESLint + Vitest coverage + Vite build |
| `security` | npm audit --audit-level=high (ambos) |
| `docker-build` | Build smoke de ambas imágenes Docker |

## Regresiones detectadas y corregidas

### QA-001: Ruta `/api/v1/anomalies` no registrada
- **Síntoma:** `analyticsRoutes` definido en `anomaly-forecast.ts` pero no montado en `app.ts`
- **Fix:** Agregar `app.route('/api/v1', analyticsRoutes)` en `app.ts`

### QA-002: `app.ts` importa sólo 4 routers, falta analytics
- **Fix:** Import de `analyticsRoutes` y montaje en `app.ts`

### QA-003: Zustand `toggleFilter` usa comparación de referencia en `value`
- **Síntoma:** Toggle no funciona con arrays como valor
- **Fix:** Comparación usando `JSON.stringify`

### QA-004: `DataTable` lanza error con `data=[]` (acceso a `data[0]` en `autoColumns`)
- **Síntoma:** `Cannot read properties of undefined`
- **Fix:** Guard `if (!data.length) return []` ya implementado

### QA-005: `DynamicChart` — caso `undefined` en `buildOption` switch
- **Síntoma:** Render vacío sin error en console cuando chart_type no soportado
- **Fix:** Default case retorna ECharts option con título de advertencia (ya implementado)

## Checklist de seguridad

- [x] Validación MIME real con `file-type` (magic bytes)
- [x] Zip-bomb detection por ratio estimado de compresión
- [x] CSV formula injection check (=, +, -, @, \t, |)
- [x] SQL whitelist SELECT-only en DuckDB service
- [x] Zod validation en todos los endpoints (tamaño de payload, tipos)
- [x] CORS restringido a orígenes conocidos
- [x] `secureHeaders()` en todas las rutas (X-Content-Type-Options, etc.)
- [x] Parámetros de filtro sanitizados (escape de comillas simples)
- [x] PII masking antes de devolver filas al cliente
- [ ] Rate limiting por IP (pendiente: `hono/rate-limiter` o Redis sliding window)
- [ ] JWT/Auth (pendiente para v2.1 — actualmente intranet sin autenticación)

## Pendientes v2.1

1. Rate limiting por IP en endpoints de ingest
2. Autenticación JWT básica (intranet, sin OAuth)
3. Tests E2E con Playwright (smoke: upload CSV → ver dashboard)
4. Internacionalización (i18n) de mensajes del engine
5. Playwright visual regression para gráficas ECharts

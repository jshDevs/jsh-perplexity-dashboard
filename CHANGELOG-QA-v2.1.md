# Changelog QA v2.1

## Implementado

### 1. Rate limiting por IP en endpoints de ingest
- Middleware `backend/src/middleware/rateLimit.ts`
- Redis fixed-window por IP y ventana configurable
- Headers `X-RateLimit-*`
- Integrado en `/api/v1/ingest/*`

### 2. Autenticación JWT básica
- Ruta `POST /api/v1/auth/login`
- Middleware `authRequired()`
- Roles: `admin`, `viewer`
- Variables de entorno: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `VIEWER_USERNAME`, `VIEWER_PASSWORD`, `JWT_SECRET`

### 3. Tests E2E smoke con Playwright
- `frontend/e2e/smoke.spec.ts`
- `frontend/playwright.config.ts`

## Pendiente siguiente
- i18n engine messages
- visual regression ECharts

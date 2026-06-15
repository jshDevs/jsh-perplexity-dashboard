# JSH Perplexity Dashboard

> Sistema de dashboards dinámicos auto-generados — superior a Power BI, 100% self-hosted, offline-first.

## Stack

| Capa | Tecnología |
|------|------------|
| Backend | Laravel 11 · PHP 8.3 |
| Frontend | React 18 · TypeScript · Vite |
| Charts | Apache ECharts 5 |
| Analytics DB | DuckDB (FFI via satur-io/duckdb-php) |
| OLTP DB | PostgreSQL 16 |
| Cache/WS Bus | Redis 7 |
| Tables | TanStack Table v8 |
| State | Zustand 4 |
| Styles | Tailwind CSS v4 |
| WebSocket | Laravel Reverb |

## Características

- ✅ Inferencia automática de schema (JSON / CSV / Excel / SQL) sin LLM
- ✅ BI-as-Code: dashboards declarados en YAML
- ✅ Selección automática de tipo de gráfico (árbol de decisión 7 nodos)
- ✅ Cross-filtering bidireccional client-side con Zustand
- ✅ Filter bookmarks por URL (nuqs)
- ✅ Anomaly detection estadístico (IQR · Z-score · CUSUM · Moving Z-score)
- ✅ Forecasting (Holt-Winters Triple Exponential Smoothing) — PHP puro
- ✅ WebSocket real-time con Laravel Reverb self-hosted
- ✅ Security pipeline: XXE/CSV-injection/Zip-bomb/SQL-injection mitigation
- ✅ $0 en licencias — solo OSS MIT/Apache-2.0

## Quick Start

```bash
git clone https://github.com/jshDevs/jsh-perplexity-dashboard.git
cd jsh-perplexity-dashboard
cp .env.example .env
docker compose up -d
docker compose exec app php artisan migrate --seed
# Abrir http://localhost:8000
```

## Estructura del proyecto

```
├── backend/          # Laravel 11 application
│   ├── app/
│   │   ├── Analytics/    # SchemaInference, ChartSelector, Anomaly, Forecast
│   │   ├── Http/         # Controllers, Requests, Resources
│   │   └── Services/     # DuckDB, MetricsRegistry, Dashboard compiler
│   ├── storage/
│   │   ├── dashboards/   # YAML dashboard definitions
│   │   ├── metrics/      # YAML metrics registry
│   │   └── data/         # User uploaded files (CSV/Parquet/JSON)
│   └── tests/            # Feature + Unit tests (PHPUnit)
├── frontend/         # React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── components/   # ECharts wrappers, TanStack Table, Filters
│   │   ├── store/        # Zustand dashboard store
│   │   ├── hooks/        # useFilteredData, useDashboard, useWebSocket
│   │   └── types/        # TypeScript interfaces
│   └── tests/            # Vitest + React Testing Library
├── docker/           # Nginx config, PHP Dockerfile
├── docker-compose.yml
└── .env.example
```

## Tests

```bash
# Backend (PHPUnit)
docker compose exec app php artisan test

# Frontend (Vitest)
docker compose exec frontend npm run test
```

## Licencia

MIT — Jorge Salazar / JSH Devs

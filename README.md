# JSH Dashboard

> **Sistema de dashboards dinámicos auto-generados** — Superior a Power BI, 100% self-hosted, offline-first, sin LLM.

## Stack

| Capa | Tecnología |
|------|------------|
| Backend API | Laravel 11, PHP 8.3 |
| Motor analítico | DuckDB 1.1.3 (CLI + FFI) |
| Inferencia de schema | PHP puro (statístico) |
| Caché | Redis 7 |
| Base de datos | PostgreSQL 16 |
| Frontend | React 18 + TypeScript + Vite |
| Gráficas | Apache ECharts 5 |
| Tabla | TanStack Table v8 |
| Estado global | Zustand + subscribeWithSelector |
| Estilos | Tailwind CSS v4 |
| WebSocket | Laravel Reverb (self-hosted) |
| Contenedores | Docker Compose |

## Quick Start

```bash
# 1. Clonar
git clone https://github.com/jshDevs/jsh-perplexity-dashboard.git
cd jsh-perplexity-dashboard

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env: cambiar passwords

# 3. Construir e iniciar
make build
make up

# 4. Generar APP_KEY (solo primera vez)
make key

# 5. Ejecutar migraciones y seed de demo
make fresh

# 6. Abrir en el navegador
open http://localhost
```

## Arquitectura

```
jsh-perplexity-dashboard/
├── backend/                  # Laravel 11
│   ├── app/
│   │   ├── Analytics/
│   │   │   ├── SchemaInferenceEngine.php  # Q1: Inferencia sin LLM
│   │   │   ├── ChartSelectorEngine.php    # Q5: Árbol de decisión O(1)
│   │   │   ├── Anomaly/StatisticalAnomalyDetector.php  # Q7
│   │   │   └── Forecast/HoltWintersForecast.php        # Q8
│   │   ├── Services/
│   │   │   ├── DuckDBService.php           # Q3: DuckDB CLI + FFI
│   │   │   ├── MetricsRegistry.php         # Q4: Semantic Layer YAML
│   │   │   ├── DashboardCompilerService.php # Q2: BI-as-Code
│   │   │   └── SecurityValidator.php       # Q10: DevSecOps
│   │   └── Http/Controllers/
│   └── tests/Unit/
├── frontend/                 # React 18 + TypeScript
│   └── src/
│       ├── components/          # DynamicChart, DataTable, FilterPanel
│       ├── pages/               # DashboardView, DataIngestion
│       ├── store/               # Zustand cross-filter store
│       └── api/                 # React Query + Axios
├── nginx/                    # Reverse proxy config
├── docker-compose.yml
└── Makefile
```

## Tests

```bash
# Backend PHPUnit (37 casos)
make test-backend

# Frontend Vitest
make test-frontend
```

## Características

- **Inferencia automática de schema** (METRIC, DIMENSION, TIME, ID, TEXT) sin LLM
- **Selección automática de gráficas** (árbol de decisión determinista de 7 nodos)
- **DuckDB** para consultas analíticas directas en CSV/Parquet/JSON (hasta 500MB)
- **Cross-filtering bidireccional** con Zustand + subscribeWithSelector
- **Detección de anomalías** (IQR, Z-score, Modified Z-score, CUSUM)
- **Forecasting** (Holt-Winters, SMA) implementado en PHP puro
- **Capa semántica** YAML: métricas reutilizables + datasets virtuales
- **Seguridad**: validación MIME real, anti-zip-bomb, SQL whitelist, CSV formula injection
- **Offline-first**: opera 100% en LAN sin internet

## Licencia

MIT — © 2026 Jorge Salazar

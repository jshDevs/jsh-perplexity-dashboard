# JSH Dashboard — Portable Edition

> Versión local sin npm, sin build step, sin backend.  
> Abre `index.html` y listo.

## Inicio rápido

```bash
# Opción 1: abrir directamente (requiere servidor por ES modules)
python -m http.server 8080
# → http://localhost:8080/portable/

# Opción 2: servidor PHP
php -S localhost:8080

# Opción 3: VS Code Live Server
# Click derecho en index.html → "Open with Live Server"
```

> **Nota:** Los ES modules (`type="module"`) requieren un servidor HTTP mínimo.  
> No funcionan si abres el archivo directo con `file://` en Chrome/Firefox.

## Estructura

```
portable/
├── index.html            ← Entrada principal
├── assets/
│   ├── styles.css        ← Estilos (sin framework)
│   └── vendor/
│       └── echarts.min.js  ← ECharts local (offline)
└── js/
    ├── app.js            ← Orquestador principal
    ├── state.js          ← Estado global pub/sub
    ├── ingest.js         ← Lectura CSV/JSON (FileReader)
    ├── infer-schema.js   ← Inferencia METRIC/DIMENSION/TIME/ID/TEXT
    ├── charts.js         ← Generación automática ECharts
    ├── table.js          ← Tabla con búsqueda y paginación
    └── storage.js        ← Persistencia localStorage
```

## Dependencias externas

| Librería | Versión | Licencia | Archivo |
|----------|---------|----------|---------|
| Apache ECharts | 5.x | Apache-2.0 | `assets/vendor/echarts.min.js` |

**Descarga ECharts local:**

```bash
curl -L https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js \
  -o portable/assets/vendor/echarts.min.js
```

## Formatos soportados (Fase Local 1)

| Formato | Soporte |
|---------|---------|
| CSV | ✅ Parseado manual RFC 4180 |
| JSON | ✅ Plano y anidado (flattening automático) |
| Excel (.xlsx) | 🔲 Fase Local 3 |

## Inferencia de schema

Sin LLM. Detecta automáticamente:

- **METRIC** — columnas numéricas con alta cardinalidad o nombres como `revenue`, `total`, `price`
- **DIMENSION** — strings o números con baja cardinalidad, nombres como `category`, `region`
- **TIME** — columnas con patrones `date`, `fecha`, `year`, o valores tipo `2026-01-01`
- **ID** — campos con sufijo `_id` o nombre `id`, `sku`, `uuid`
- **TEXT** — strings de alta cardinalidad (sin patrón de agrupación)

## Charts generados automáticamente

| Condición | Chart generado |
|-----------|----------------|
| TIME + METRIC | Línea temporal |
| DIMENSION + METRIC | Barras agrupadas |
| DIMENSION (≤10 valores) + METRIC | Pie/Donut |
| 2+ METRICS + DIMENSION | Barras múltiples |

## Persistencia

- **Dashboards** → `localStorage` (clave: `jsh_local_dashboards`)
- **Último dataset** → `localStorage` (máx. 200 filas + schema)
- **Tema** → `localStorage` (clave: `jsh_local_theme`)

## Roadmap de fases

| Fase | Descripción | Estado |
|------|-------------|--------|
| Local 1 | Esqueleto base — CSV/JSON → tabla + charts | ✅ |
| Local 2 | Schema inference avanzada + builder + IndexedDB | 🔲 |
| Local 3 | Cross-filter + export PNG/CSV/XLSX/PDF + Excel | 🔲 |
| Local 4 | PWA instalable + vendor bundle offline completo | 🔲 |

## Rama

Esta versión vive en la rama `jsh_local`.  
El sistema completo (Docker, PostgreSQL, Redis, Auth) está en `main`.

---

MIT © 2026 Jorge Salazar ([@jshDevs](https://github.com/jshDevs))

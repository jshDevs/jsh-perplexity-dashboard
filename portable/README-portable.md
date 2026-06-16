# JSH Dashboard — Portable Edition

> Versión local sin npm, sin build step, sin backend.  
> Abre `index.html` y listo.

## Inicio rápido

```bash
# Opción 1: Python
python -m http.server 8080
# → http://localhost:8080/portable/

# Opción 2: PHP
php -S localhost:8080

# Opción 3: VS Code Live Server
# Click derecho en index.html → "Open with Live Server"
```

> **Nota:** ES modules requieren servidor HTTP mínimo.
> No funciona desde `file://` en Chrome/Firefox.

## Estructura

```
portable/
├── index.html              ← Entrada principal
├── assets/
│   ├── styles.css          ← Estilos (sin framework)
│   └── vendor/
│       └── echarts.min.js  ← ECharts offline
└── js/
    ├── app.js              ← Orquestador principal v2
    ├── state.js            ← Estado global pub/sub
    ├── ingest.js           ← FileReader CSV/JSON
    ├── infer-schema.js     ← Inferencia v2 + BOOLEAN + confidence
    ├── charts.js           ← Auto-charts v2 + scatter + grouped-bar
    ├── table.js            ← Tabla search/sort/paginate
    ├── storage.js          ← localStorage
    ├── idb.js              ← IndexedDB (datasets completos)
    ├── builder.js          ← Builder drag-drop HTML5
    ├── stats.js            ← Estadísticas descriptivas
    ├── anomaly.js          ← IQR + MAD + CUSUM
    └── relations.js        ← Detección FK_PATTERN + VALUE_OVERLAP
```

## Dependencias

| Librería       | Versión | Licencia    | Archivo |
|----------------|---------|-------------|---------|
| Apache ECharts | 5.x     | Apache-2.0  | `assets/vendor/echarts.min.js` |

```bash
curl -L https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js \
  -o portable/assets/vendor/echarts.min.js
```

## Formatos soportados

| Formato       | Soporte |
|---------------|---------|
| CSV           | ✅ RFC 4180 |
| JSON plano    | ✅ Array de objetos |
| JSON anidado  | ✅ Auto-flatten |
| Excel (.xlsx) | 🔲 Fase Local 3 |

## Tipos de columna inferidos

| Tipo      | Detección |
|-----------|-----------|
| METRIC    | Numérico + alta cardinalidad o nombre (revenue, total…) |
| DIMENSION | Baja cardinalidad o nombre (category, region…) |
| TIME      | Patrón nombre o valores `YYYY-MM-DD` |
| ID        | Sufijo `_id`, nombre `id`, `sku`, `uuid` |
| TEXT      | Alta cardinalidad de strings |
| BOOLEAN   | Valores `true/false/1/0/yes/no` |

## Charts auto-generados

| Condición                       | Chart |
|---------------------------------|-------|
| TIME + METRIC                   | Línea temporal |
| DIMENSION + METRIC              | Barras |
| DIMENSION (≤10 valores) + METRIC| Pie/Donut |
| 2+ METRICS + DIMENSION          | Barras múltiples |
| Fallback                        | Barras col[0] vs col[1] |

## Nuevas capacidades en Fase Local 2

### IndexedDB
Datasets completos guardados en IDB — sin límite de 5 MB de localStorage.  
Panel "Datasets guardados" en el sidebar para cargar datasets previos.

### Chart Builder (drag-drop)
Botón **⚙ Builder** en el topbar.  
Arrastra campos del schema a las zonas X / Y / Agrupar para configurar charts personalizados.  
Soporta: Auto, Barras, Línea, Pie, Scatter.

### Estadísticas descriptivas
Panel colapsable con `min, max, mean, median, std, sum, nulls` por cada columna METRIC.

### Detección de anomalías (sin ML)
- **IQR** — Interquartile Range (outliers clásicos)
- **MAD** — Modified Z-score (robusto a distribuciones sesgadas)
- **CUSUM** — Cumulative Sum (cambios de nivel en series temporales)

### Relaciones detectadas
- **FK_PATTERN** — campos con sufijo `_id` y raíz común
- **VALUE_OVERLAP** — campos con Jaccard similarity > 70%

### Schema v2
- Nuevo tipo `BOOLEAN`
- Campo `confidence` (0–1) por columna
- Patrones extendidos para dominios en español

## Persistencia

| Dato          | Almacén |
|---------------|---------|
| Dashboards    | localStorage (`jsh_local_dashboards`) |
| Tema          | localStorage (`jsh_local_theme`) |
| Dataset preview (200 filas) | localStorage (`jsh_local_last_dataset`) |
| Datasets completos | IndexedDB (`jsh_local` / store `datasets`) |

## Roadmap

| Fase     | Estado |
|----------|--------|
| Local 1  | ✅ Esqueleto base CSV/JSON → tabla + charts |
| Local 2  | ✅ IndexedDB + builder + stats + anomaly + relations |
| Local 3  | 🔲 Cross-filter + export XLSX/PDF + Excel |
| Local 4  | 🔲 PWA + vendor bundle offline completo |

---

MIT © 2026 Jorge Salazar ([@jshDevs](https://github.com/jshDevs))

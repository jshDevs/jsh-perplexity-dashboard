<?php

namespace App\Services;

use App\Analytics\ChartSelectorEngine;
use App\Analytics\DatasetMeta;
use App\Analytics\SchemaInferenceEngine;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\Yaml\Yaml;

/**
 * Compiles YAML dashboard definitions into executable query plans
 * and chart configuration for the frontend.
 */
class DashboardCompilerService
{
    public function __construct(
        private readonly DuckDBService       $duckDB,
        private readonly MetricsRegistry     $metrics,
        private readonly ChartSelectorEngine $chartSelector,
        private readonly SchemaInferenceEngine $schemaEngine,
    ) {}

    /**
     * Load and compile a dashboard YAML file.
     */
    public function compile(string $slug): array
    {
        $cacheKey = "dashboard_compiled:{$slug}";

        return Cache::tags(['dashboards', "dashboard_{$slug}"])
            ->remember($cacheKey, now()->addMinutes(5), function () use ($slug) {
                return $this->doCompile($slug);
            });
    }

    /**
     * Execute a dashboard query with filters applied.
     *
     * @param  array $filters  [{field, operator, value}]
     */
    public function executeQuery(string $slug, array $filters = [], array $params = []): array
    {
        $compiled  = $this->compile($slug);
        $cacheKey  = "dashboard_query:{$slug}:" . md5(json_encode([$filters, $params]));
        $ttl       = config('dashboard.cache_ttl_minutes', 15);

        return Cache::tags(['analytics', "dashboard_{$slug}"])
            ->remember($cacheKey, now()->addMinutes($ttl), function () use ($compiled, $filters, $params) {
                return $this->runQuery($compiled, $filters, $params);
            });
    }

    public function listDashboards(): array
    {
        $path  = config('dashboard.dashboards_path');
        $files = glob("{$path}/*.yaml") ?: [];
        $list  = [];

        foreach ($files as $file) {
            $yaml   = Yaml::parseFile($file);
            $list[] = [
                'slug'        => basename($file, '.yaml'),
                'title'       => $yaml['title'] ?? basename($file, '.yaml'),
                'description' => $yaml['description'] ?? null,
                'updated_at'  => date('c', filemtime($file)),
            ];
        }

        return $list;
    }

    // ── Private ────────────────────────────────────────────────────────

    private function doCompile(string $slug): array
    {
        $path = config('dashboard.dashboards_path') . "/{$slug}.yaml";

        if (!file_exists($path)) {
            throw new \InvalidArgumentException("Dashboard '{$slug}' not found");
        }

        $yaml = Yaml::parseFile($path);

        // Resolve metrics from registry if referenced
        foreach ($yaml['measures'] ?? [] as &$measure) {
            if (isset($measure['metric_ref'])) {
                $measure['expression'] = $this->metrics->resolve($measure['metric_ref']);
            }
        }

        // Build auto chart configs if not specified
        if (!isset($yaml['charts'])) {
            $yaml['charts'] = $this->autoGenerateCharts($yaml);
        }

        return $yaml;
    }

    private function autoGenerateCharts(array $yaml): array
    {
        // Build a minimal DatasetMeta from YAML definitions for chart selection
        $columns  = [];
        $rowCount = 0;

        foreach ($yaml['dimensions'] ?? [] as $dim) {
            $col = new \App\Analytics\ColumnMeta($dim['name'], \App\Analytics\ColumnMeta::TYPE_DIMENSION);
            $col->distinctValues = $dim['cardinality'] ?? 10;
            $columns[$dim['name']] = $col;
        }

        foreach ($yaml['measures'] ?? [] as $m) {
            $col = new \App\Analytics\ColumnMeta($m['name'], \App\Analytics\ColumnMeta::TYPE_METRIC);
            $columns[$m['name']] = $col;
        }

        if (isset($yaml['time_dimension'])) {
            $col = new \App\Analytics\ColumnMeta(
                $yaml['time_dimension']['column'],
                \App\Analytics\ColumnMeta::TYPE_TIME
            );
            $columns[$yaml['time_dimension']['column']] = $col;
        }

        $meta = new DatasetMeta($yaml['title'] ?? 'auto', $columns, $rowCount);
        $rec  = $this->chartSelector->recommend($meta);

        return [['auto_generated' => true] + $rec->toArray()];
    }

    private function runQuery(array $compiled, array $filters, array $params): array
    {
        $datasource = $compiled['datasource'] ?? [];
        $type       = $datasource['type'] ?? 'duckdb';

        $baseQuery  = isset($datasource['path'])
            ? $this->buildFileQuery($datasource, $compiled)
            : ($datasource['query'] ?? 'SELECT 1');

        $whereClause = $this->buildWhereClause($filters);
        $finalQuery  = $whereClause
            ? "WITH __base AS ({$baseQuery}) SELECT * FROM __base WHERE {$whereClause}"
            : $baseQuery;

        return $this->duckDB->query($finalQuery, $params);
    }

    private function buildFileQuery(array $datasource, array $compiled): string
    {
        $path = $datasource['path'];
        $ext  = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        $readFn = match ($ext) {
            'csv'     => "read_csv_auto('{$path}')",
            'parquet' => "parquet_scan('{$path}')",
            'json'    => "read_json_auto('{$path}')",
            default   => "read_csv_auto('{$path}')",
        };

        $measures   = collect($compiled['measures'] ?? [])
            ->map(fn($m) => "{$m['expression']} AS {$m['name']}")
            ->implode(', ');

        $dimensions = collect($compiled['dimensions'] ?? [])
            ->pluck('column')
            ->implode(', ');

        $timeCol    = $compiled['time_dimension']['column'] ?? null;
        $selectParts = array_filter([$dimensions, $timeCol, $measures]);
        $select      = implode(', ', $selectParts) ?: '*';

        $groupBy     = array_filter([$dimensions, $timeCol]);
        $group       = $groupBy ? 'GROUP BY ' . implode(', ', $groupBy) : '';

        return "SELECT {$select} FROM {$readFn} {$group}";
    }

    private function buildWhereClause(array $filters): string
    {
        $clauses = [];
        foreach ($filters as $filter) {
            $field    = preg_replace('/[^a-zA-Z0-9_]/', '', $filter['field'] ?? '');
            $operator = $filter['operator'] ?? '=';
            $value    = $filter['value'] ?? null;

            if (empty($field) || $value === null) continue;

            $allowedOps = ['=', '!=', '<', '>', '<=', '>=', 'IN', 'BETWEEN', 'LIKE'];
            if (!in_array(strtoupper($operator), $allowedOps)) continue;

            if (is_array($value)) {
                $escaped  = array_map(fn($v) => "'" . addslashes((string) $v) . "'", $value);
                $clauses[] = "{$field} IN (" . implode(', ', $escaped) . ')';
            } elseif (is_numeric($value)) {
                $clauses[] = "{$field} {$operator} {$value}";
            } else {
                $safe = addslashes((string) $value);
                $clauses[] = "{$field} {$operator} '{$safe}'";
            }
        }

        return implode(' AND ', $clauses);
    }
}

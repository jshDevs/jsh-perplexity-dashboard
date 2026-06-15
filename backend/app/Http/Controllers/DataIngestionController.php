<?php

namespace App\Http\Controllers;

use App\Analytics\SchemaInferenceEngine;
use App\Analytics\DatasetMeta;
use App\Services\DuckDBService;
use App\Services\SecurityValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;

class DataIngestionController extends Controller
{
    public function __construct(
        private readonly SecurityValidator     $security,
        private readonly SchemaInferenceEngine $schemaEngine,
        private readonly DuckDBService         $duckDB,
    ) {}

    /**
     * Upload a CSV/Excel/Parquet/JSON file and infer its schema.
     */
    public function ingestFile(Request $request): JsonResponse
    {
        $request->validate(['file' => 'required|file']);
        $file = $request->file('file');

        // Security pipeline
        $this->security->validateFile($file);
        $safeName  = $this->security->safeFilename($file);
        $storedPath = $file->storeAs('data', $safeName, 'local');
        $absPath    = storage_path('app/' . $storedPath);

        $ext = strtolower($file->getClientOriginalExtension());

        // Convert XLSX to CSV for DuckDB
        if (in_array($ext, ['xlsx', 'xls'])) {
            $csvPath = $this->convertExcelToCsv($absPath);
            $absPath = $csvPath;
        }

        // Sample data and infer schema
        try {
            $rows   = $this->duckDB->sampleFile($absPath, config('dashboard.schema_sample_size', 500));
            $schema = $this->schemaEngine->inferFromRows($rows);
        } catch (\Exception $e) {
            // Fallback: parse CSV manually for inference
            $rows   = $this->parseCsvManual($absPath, 500);
            $schema = $this->schemaEngine->inferFromRows($rows);
        }

        $datasetId = Str::uuid()->toString();
        $meta      = new DatasetMeta($datasetId, $schema, count($rows));

        // Cache schema for frontend overrides
        cache()->put("schema:{$datasetId}", $meta->toArray(), now()->addHours(24));
        cache()->put("schema_path:{$datasetId}", $absPath, now()->addHours(24));

        return response()->json([
            'data' => [
                'dataset_id'  => $datasetId,
                'filename'    => $file->getClientOriginalName(),
                'stored_as'   => $safeName,
                'row_count'   => count($rows),
                'schema'      => $meta->toArray(),
                'chart_hint'  => app(\App\Analytics\ChartSelectorEngine::class)->recommend($meta)->toArray(),
            ],
        ], 201);
    }

    /**
     * Ingest raw JSON and infer schema.
     */
    public function ingestJson(Request $request): JsonResponse
    {
        $request->validate(['payload' => 'required']);
        $raw = $request->input('payload');

        if (is_string($raw)) {
            $data = json_decode($raw, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return response()->json(['error' => 'Invalid JSON: ' . json_last_error_msg()], 422);
            }
        } else {
            $data = $raw;
        }

        // Normalize: if single object, wrap in array
        if (array_keys($data) !== range(0, count($data) - 1)) {
            $data = [$data];
        }

        // Flatten nested objects (1 level deep)
        $rows   = array_map([$this, 'flattenRow'], array_slice($data, 0, 500));
        $schema = $this->schemaEngine->inferFromRows($rows);

        $datasetId = Str::uuid()->toString();
        $meta      = new DatasetMeta($datasetId, $schema, count($data));

        cache()->put("schema:{$datasetId}", $meta->toArray(), now()->addHours(24));

        return response()->json([
            'data' => [
                'dataset_id' => $datasetId,
                'row_count'  => count($data),
                'schema'     => $meta->toArray(),
                'chart_hint' => app(\App\Analytics\ChartSelectorEngine::class)->recommend($meta)->toArray(),
            ],
        ], 201);
    }

    /**
     * Parse a SQL query string and infer output schema from column names/types.
     */
    public function ingestSql(Request $request): JsonResponse
    {
        $request->validate(['sql' => 'required|string|max:5000']);
        $sql = $request->input('sql');

        app(\App\Services\SecurityValidator::class)->validateSql($sql);

        // Use PHP-SQL-Parser for AST analysis
        try {
            $parser  = new \PHPSQLParser\PHPSQLParser($sql);
            $ast     = $parser->parsed;
            $columns = $this->extractColumnsFromAst($ast);
        } catch (\Exception $e) {
            return response()->json(['error' => 'SQL parsing failed: ' . $e->getMessage()], 422);
        }

        $datasetId = Str::uuid()->toString();
        return response()->json([
            'data' => [
                'dataset_id' => $datasetId,
                'sql'        => $sql,
                'ast_columns'=> $columns,
            ],
        ], 201);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private function convertExcelToCsv(string $xlsxPath): string
    {
        $spreadsheet = IOFactory::load($xlsxPath);
        $sheet       = $spreadsheet->getActiveSheet();

        // Unmerge cells first
        foreach ($sheet->getMergedCells() as $mergeRange) {
            $bounds = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::getRangeBoundaries($mergeRange);
            $value  = $sheet->getCell($bounds[0][0] . $bounds[0][1])->getValue();
            $sheet->unmergeCells($mergeRange);
            for ($row = $bounds[0][1]; $row <= $bounds[1][1]; $row++) {
                for ($col = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($bounds[0][0]);
                     $col <= \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($bounds[1][0]);
                     $col++) {
                    $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col);
                    $sheet->setCellValue($colLetter . $row, $value);
                }
            }
        }

        $csvPath = preg_replace('/\.(xlsx|xls)$/i', '.csv', $xlsxPath);
        $writer  = new \PhpOffice\PhpSpreadsheet\Writer\Csv($spreadsheet);
        $writer->setDelimiter(',');
        $writer->setEnclosure('"');
        $writer->save($csvPath);

        return $csvPath;
    }

    private function parseCsvManual(string $path, int $limit): array
    {
        $rows    = [];
        $headers = null;
        $handle  = fopen($path, 'r');

        if (!$handle) return [];

        $count = 0;
        while (($row = fgetcsv($handle, 0, ',', '"')) !== false && $count < $limit) {
            if ($headers === null) {
                $headers = $row;
            } else {
                $rows[] = array_combine($headers, $row) ?: [];
                $count++;
            }
        }
        fclose($handle);
        return $rows;
    }

    private function flattenRow(array $row, string $prefix = ''): array
    {
        $flat = [];
        foreach ($row as $key => $value) {
            $k = $prefix ? "{$prefix}_{$key}" : $key;
            if (is_array($value) && !isset($value[0])) {
                // Nested object: flatten one level
                foreach ($value as $subKey => $subValue) {
                    $flat["{$k}_{$subKey}"] = is_array($subValue) ? json_encode($subValue) : $subValue;
                }
            } else {
                $flat[$k] = is_array($value) ? json_encode($value) : $value;
            }
        }
        return $flat;
    }

    private function extractColumnsFromAst(array $ast): array
    {
        $columns = [];
        foreach ($ast['SELECT'] ?? [] as $col) {
            $isAggregate = $col['expr_type'] === 'aggregate_function';
            $columns[]   = [
                'name'       => $col['alias'] ?? $col['base_expr'] ?? 'unknown',
                'expression' => $col['base_expr'] ?? '',
                'type_hint'  => $isAggregate ? 'METRIC' : 'unknown',
                'aggregate'  => $isAggregate,
            ];
        }
        return $columns;
    }
}

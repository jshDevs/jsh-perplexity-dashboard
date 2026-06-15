<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use App\Exceptions\SecurityException;

/**
 * DuckDB integration service.
 * Supports CLI subprocess mode (stable) and FFI mode (PHP 8.3+).
 * Uses harish81/laravel-duckdb CLI pattern by default for stability.
 */
class DuckDBService
{
    private string $mode;
    private string $cliPath;
    private string $maxMemory;
    private int    $threads;
    private int    $queryTimeout;

    public function __construct()
    {
        $this->mode         = config('dashboard.duckdb_mode', 'cli');
        $this->cliPath      = config('dashboard.duckdb_cli_path', '/usr/local/bin/duckdb');
        $this->maxMemory    = config('dashboard.duckdb_memory', '1GB');
        $this->threads      = (int) config('dashboard.duckdb_threads', 4);
        $this->queryTimeout = (int) config('dashboard.query_timeout', 30);
    }

    /**
     * Execute a SQL query against a file or in-memory DuckDB database.
     *
     * @param  string  $sql     Validated SQL (SELECT only)
     * @param  array   $params  Named parameters [{':key' => value}]
     * @return array<int, array<string, mixed>>
     * @throws SecurityException
     */
    public function query(string $sql, array $params = []): array
    {
        $this->validateSelectOnly($sql);
        $boundSql = $this->bindParams($sql, $params);

        return match ($this->mode) {
            'ffi'   => $this->queryFFI($boundSql),
            'cli'   => $this->queryCLI($boundSql),
            default => $this->queryCLI($boundSql),
        };
    }

    /**
     * Query a local file (CSV, Parquet, JSON, XLSX converted to CSV) directly.
     *
     * @param  string $filePath  Absolute path to file in storage/data
     * @param  string $sql       SQL query using DuckDB file functions
     * @return array<int, array<string, mixed>>
     */
    public function queryFile(string $filePath, string $sql): array
    {
        $this->validateFilePath($filePath);
        $this->validateSelectOnly($sql);

        return $this->queryCLI($sql);
    }

    /**
     * Infer schema of a file using DuckDB's auto-detection.
     *
     * @return array<int, array{column_name: string, column_type: string}>
     */
    public function inferFileSchema(string $filePath): array
    {
        $this->validateFilePath($filePath);
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

        $sql = match ($ext) {
            'csv'     => "DESCRIBE SELECT * FROM read_csv_auto('{$filePath}')",
            'parquet' => "DESCRIBE SELECT * FROM parquet_scan('{$filePath}')",
            'json'    => "DESCRIBE SELECT * FROM read_json_auto('{$filePath}')",
            'ndjson'  => "DESCRIBE SELECT * FROM read_ndjson_auto('{$filePath}')",
            default   => throw new SecurityException("Unsupported file type: {$ext}"),
        };

        return $this->queryCLI($sql);
    }

    /**
     * Get sample rows from a file for schema inference.
     *
     * @return array<int, array<string, mixed>>
     */
    public function sampleFile(string $filePath, int $limit = 500): array
    {
        $this->validateFilePath($filePath);
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

        $readFn = match ($ext) {
            'csv'     => "read_csv_auto('{$filePath}')",
            'parquet' => "parquet_scan('{$filePath}')",
            'json'    => "read_json_auto('{$filePath}')",
            default   => throw new SecurityException("Unsupported file type: {$ext}"),
        };

        return $this->queryCLI("SELECT * FROM {$readFn} LIMIT {$limit}");
    }

    // ── CLI subprocess (stable, always available) ────────────────────────

    private function queryCLI(string $sql): array
    {
        $config = implode(' ', [
            "-memory_limit {$this->maxMemory}",
            "-threads {$this->threads}",
        ]);

        $cmd    = escapeshellarg($this->cliPath);
        $sqlEsc = escapeshellarg($sql);

        $command = "{$cmd} :memory: {$config} -json -c {$sqlEsc} 2>&1";

        $output     = [];
        $returnCode = 0;

        $descriptor = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = proc_open($command, $descriptor, $pipes);
        if (!is_resource($process)) {
            throw new \RuntimeException('Failed to start DuckDB process');
        }

        fclose($pipes[0]);
        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);

        $returnCode = proc_close($process);

        if ($returnCode !== 0) {
            Log::error('DuckDB CLI error', ['sql' => substr($sql, 0, 200), 'stderr' => $stderr]);
            throw new \RuntimeException('DuckDB query failed: ' . $stderr);
        }

        $decoded = json_decode($stdout, true);
        return is_array($decoded) ? $decoded : [];
    }

    // ── FFI mode (PHP 8.3 + ext-ffi) ──────────────────────────────────

    private function queryFFI(string $sql): array
    {
        // Requires: composer require satur-io/duckdb-php
        if (!class_exists('\\Saturio\\DuckDB\\DuckDB')) {
            Log::warning('satur-io/duckdb-php not installed, falling back to CLI');
            return $this->queryCLI($sql);
        }

        try {
            $db     = new \Saturio\DuckDB\DuckDB();
            $result = $db->query($sql);
            return $result->fetchAll() ?? [];
        } catch (\Throwable $e) {
            Log::error('DuckDB FFI error', ['error' => $e->getMessage()]);
            return $this->queryCLI($sql); // Graceful fallback
        }
    }

    // ── Security helpers ────────────────────────────────────────────

    private function validateSelectOnly(string $sql): void
    {
        $upper    = strtoupper(trim($sql));
        $forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER',
                      'CREATE', 'EXEC', 'EXECUTE', 'COPY', 'ATTACH', 'DETACH',
                      'PRAGMA', 'LOAD', 'INSTALL'];

        foreach ($forbidden as $keyword) {
            if (str_contains($upper, $keyword)) {
                throw new SecurityException("SQL operation not allowed: {$keyword}");
            }
        }

        if (!str_starts_with($upper, 'SELECT') && !str_starts_with($upper, 'DESCRIBE') && !str_starts_with($upper, 'WITH')) {
            throw new SecurityException('Only SELECT, DESCRIBE, and WITH queries are allowed');
        }
    }

    private function validateFilePath(string $path): void
    {
        $dataPath  = realpath(storage_path('data'));
        $realPath  = realpath($path);

        if ($realPath === false || !str_starts_with($realPath, $dataPath)) {
            throw new SecurityException('File path is outside the allowed data directory');
        }
    }

    private function bindParams(string $sql, array $params): string
    {
        foreach ($params as $key => $value) {
            $safe  = $this->sanitizeParamValue($value);
            $sql   = str_replace("{{$key}}", $safe, $sql);
        }
        return $sql;
    }

    private function sanitizeParamValue(mixed $value): string
    {
        if (is_null($value))  return 'NULL';
        if (is_bool($value))  return $value ? 'TRUE' : 'FALSE';
        if (is_numeric($value)) return (string) $value;
        if (preg_match('/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$/', (string) $value)) {
            return "'" . $value . "'";
        }
        // Reject anything else to prevent injection
        throw new SecurityException("Unsupported parameter type for value: " . gettype($value));
    }
}

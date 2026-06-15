<?php

return [
    /*
    |--------------------------------------------------------------------------
    | JSH Dashboard Configuration
    |--------------------------------------------------------------------------
    */

    // Storage paths
    'dashboards_path' => storage_path('dashboards'),
    'metrics_path'    => storage_path('metrics'),
    'data_path'       => storage_path('data'),

    // DuckDB integration mode: ffi | cli | sidecar
    'duckdb_mode'     => env('DUCKDB_MODE', 'cli'),
    'duckdb_cli_path' => env('DUCKDB_CLI_PATH', '/usr/local/bin/duckdb'),
    'duckdb_memory'   => env('DUCKDB_MAX_MEMORY', '1GB'),
    'duckdb_threads'  => env('DUCKDB_THREADS', 4),

    // Security limits
    'max_upload_mb'      => env('MAX_UPLOAD_SIZE_MB', 50),
    'query_timeout'      => env('QUERY_TIMEOUT_SECONDS', 30),
    'query_rate_limit'   => env('QUERY_RATE_LIMIT', 10),
    'max_zip_ratio'      => 50,      // Maximum compression ratio for XLSX files
    'max_uncompressed_mb'=> 200,     // Max uncompressed size in MB
    'schema_sample_size' => 500,     // Rows to sample for type inference

    // Analytics
    'cache_ttl_minutes'     => 15,
    'anomaly_window_size'   => 20,   // Moving Z-score window
    'anomaly_threshold'     => 2.5,  // Z-score threshold
    'forecast_min_points'   => 30,   // Min data points for forecasting

    // Chart selection
    'chart_max_pie_categories'  => 5,
    'chart_max_bar_categories'  => 20,
    'chart_canvas_threshold'    => 1000, // Use canvas renderer above this row count

    // Allowed MIME types for uploads
    'allowed_mimes' => [
        'text/csv',
        'text/plain',
        'application/json',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/octet-stream',
    ],
];

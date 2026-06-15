<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DataIngestionController;
use App\Http\Controllers\MetricsController;
use App\Http\Controllers\SchemaController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Http\Request;
use Illuminate\Cache\RateLimiting\Limit;

// Rate limiters
RateLimiter::for('analytics', function (Request $request) {
    return Limit::perMinute((int) config('dashboard.query_rate_limit', 10))
        ->by($request->user()?->id ?? $request->ip());
});

RateLimiter::for('uploads', function (Request $request) {
    return Limit::perMinute(5)->by($request->user()?->id ?? $request->ip());
});

Route::prefix('v1')->group(function () {

    // ── Dashboards ────────────────────────────────────────────────
    Route::get('/dashboards', [DashboardController::class, 'index']);
    Route::get('/dashboards/{slug}', [DashboardController::class, 'show']);
    Route::middleware('throttle:analytics')->group(function () {
        Route::post('/dashboards/{slug}/query', [DashboardController::class, 'query']);
        Route::post('/dashboards/{slug}/forecast', [DashboardController::class, 'forecast']);
        Route::post('/dashboards/{slug}/anomalies', [DashboardController::class, 'anomalies']);
    });

    // ── Schema Inference ──────────────────────────────────────────
    Route::middleware('throttle:uploads')->group(function () {
        Route::post('/ingest/file', [DataIngestionController::class, 'ingestFile']);
        Route::post('/ingest/json', [DataIngestionController::class, 'ingestJson']);
        Route::post('/ingest/sql', [DataIngestionController::class, 'ingestSql']);
    });
    Route::get('/schema/{datasetId}', [SchemaController::class, 'show']);
    Route::patch('/schema/{datasetId}/columns/{column}', [SchemaController::class, 'overrideColumn']);

    // ── Metrics Registry ─────────────────────────────────────────
    Route::get('/metrics', [MetricsController::class, 'index']);
    Route::get('/metrics/{name}', [MetricsController::class, 'show']);

    // ── Health ───────────────────────────────────────────────────
    Route::get('/health', function () {
        return response()->json([
            'status'    => 'ok',
            'timestamp' => now()->toISOString(),
            'services'  => [
                'database' => \Illuminate\Support\Facades\DB::connection()->getPdo() ? 'ok' : 'error',
                'redis'    => \Illuminate\Support\Facades\Cache::store('redis')->put('health_check', 1, 5) ? 'ok' : 'error',
            ],
        ]);
    });
});

<?php

namespace App\Http\Controllers;

use App\Analytics\Anomaly\StatisticalAnomalyDetector;
use App\Analytics\Forecast\HoltWintersForecast;
use App\Services\DashboardCompilerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardCompilerService  $compiler,
        private readonly StatisticalAnomalyDetector $anomalyDetector,
        private readonly HoltWintersForecast        $forecast,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->compiler->listDashboards(),
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        try {
            $compiled = $this->compiler->compile($slug);
            return response()->json(['data' => $compiled]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }
    }

    public function query(Request $request, string $slug): JsonResponse
    {
        $validated = $request->validate([
            'filters'   => 'array',
            'filters.*.field'    => 'required|string|alpha_dash',
            'filters.*.operator' => 'required|string|in:=,!=,<,>,<=,>=,IN,BETWEEN,LIKE',
            'filters.*.value'    => 'required',
            'params'    => 'array',
            'limit'     => 'integer|min:1|max:10000',
            'offset'    => 'integer|min:0',
        ]);

        try {
            $data = $this->compiler->executeQuery(
                $slug,
                $validated['filters'] ?? [],
                $validated['params']  ?? []
            );

            return response()->json([
                'data'  => $data,
                'count' => count($data),
                'meta'  => ['slug' => $slug, 'cached' => true],
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function anomalies(Request $request, string $slug): JsonResponse
    {
        $validated = $request->validate([
            'values'    => 'required|array|min:4',
            'values.*'  => 'numeric',
            'algorithm' => 'string|in:iqr,zscore,modified_zscore,moving_zscore,cusum,auto',
        ]);

        $result = $this->anomalyDetector->detect(
            array_map('floatval', $validated['values']),
            $validated['algorithm'] ?? 'auto'
        );

        return response()->json(['data' => $result]);
    }

    public function forecast(Request $request, string $slug): JsonResponse
    {
        $validated = $request->validate([
            'values'   => 'required|array|min:10',
            'values.*' => 'numeric',
            'season'   => 'integer|min:2|max:365',
            'horizon'  => 'integer|min:1|max:120',
            'alpha'    => 'numeric|min:0.01|max:0.99',
            'beta'     => 'numeric|min:0.01|max:0.99',
            'gamma'    => 'numeric|min:0.01|max:0.99',
        ]);

        try {
            $minPoints = config('dashboard.forecast_min_points', 30);
            $values    = array_map('floatval', $validated['values']);

            if (count($values) < $minPoints) {
                return response()->json(['error' => "Forecasting requires at least {$minPoints} data points"], 422);
            }

            $season  = $validated['season']  ?? 12;
            $horizon = $validated['horizon'] ?? 12;

            if (count($values) < 2 * $season) {
                // Fallback to SMA when not enough data for Holt-Winters
                $result = $this->forecast->sma($values, min($season, (int)(count($values) / 2)), $horizon);
            } else {
                $result = $this->forecast->forecast(
                    $values, $season, $horizon,
                    $validated['alpha'] ?? 0.3,
                    $validated['beta']  ?? 0.1,
                    $validated['gamma'] ?? 0.2,
                );
            }

            return response()->json(['data' => $result->toArray()]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
}

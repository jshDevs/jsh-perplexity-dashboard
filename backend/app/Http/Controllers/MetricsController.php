<?php

namespace App\Http\Controllers;

use App\Services\MetricsRegistry;
use Illuminate\Http\JsonResponse;

class MetricsController extends Controller
{
    public function __construct(private readonly MetricsRegistry $registry)
    {
        $this->registry->loadFromDirectory(config('dashboard.metrics_path'));
    }

    public function index(): JsonResponse
    {
        return response()->json(['data' => $this->registry->getMeasures()]);
    }

    public function show(string $name): JsonResponse
    {
        try {
            return response()->json(['data' => [
                'name'       => $name,
                'expression' => $this->registry->resolve($name),
            ]]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }
    }
}

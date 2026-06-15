<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SchemaController extends Controller
{
    public function show(string $datasetId): JsonResponse
    {
        $schema = cache()->get("schema:{$datasetId}");

        if (!$schema) {
            return response()->json(['error' => 'Dataset not found or expired'], 404);
        }

        return response()->json(['data' => $schema]);
    }

    public function overrideColumn(Request $request, string $datasetId, string $column): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|string|in:METRIC,DIMENSION,TIME,ID,TEXT',
        ]);

        $schema = cache()->get("schema:{$datasetId}");
        if (!$schema) {
            return response()->json(['error' => 'Dataset not found'], 404);
        }

        if (!isset($schema['columns'][$column])) {
            return response()->json(['error' => "Column '{$column}' not found"], 404);
        }

        $schema['columns'][$column]['type'] = $validated['type'];
        $schema['columns'][$column]['manually_overridden'] = true;
        cache()->put("schema:{$datasetId}", $schema, now()->addHours(24));

        return response()->json(['data' => $schema['columns'][$column]]);
    }
}

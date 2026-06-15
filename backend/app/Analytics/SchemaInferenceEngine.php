<?php

namespace App\Analytics;

use App\Exceptions\SchemaInferenceException;

/**
 * Infers column types (METRIC | DIMENSION | TIME | ID | TEXT)
 * from a data sample using statistical analysis.
 * No LLM required.
 */
class SchemaInferenceEngine
{
    private const METRIC_PATTERNS    = '/^(price|amount|total|sum|qty|quantity|count|revenue|cost|rate|score|value|avg|mean|sales|profit|margin|weight|distance|duration|balance|income|expense|budget)/i';
    private const TIME_PATTERNS      = '/(_at|_on|_date|_time|_period|date|time|period|year|month|week|day|hour|timestamp|created|updated|deleted|at$)/i';
    private const ID_PATTERNS        = '/(_id|_uuid|_key|_code|_ref|_num|_no|^id$|^uuid$|^key$|^code$)/i';
    private const DIMENSION_PATTERNS = '/^(category|type|status|region|country|city|state|province|group|segment|label|flag|brand|channel|source|medium|platform|department|role|gender|tier|level|priority|class)/i';

    private int $sampleSize;

    public function __construct(int $sampleSize = 500)
    {
        $this->sampleSize = $sampleSize;
    }

    /**
     * Infer schema from an array of rows (associative arrays).
     *
     * @param  array<int, array<string, mixed>> $rows
     * @return array<string, ColumnMeta>
     */
    public function inferFromRows(array $rows): array
    {
        if (empty($rows)) {
            throw new SchemaInferenceException('Cannot infer schema from empty dataset');
        }

        $sample  = array_slice($rows, 0, $this->sampleSize);
        $columns = array_keys($sample[0]);
        $result  = [];

        foreach ($columns as $column) {
            $values  = array_column($sample, $column);
            $result[$column] = $this->inferColumn((string) $column, $values);
        }

        return $result;
    }

    /**
     * Infer a single column from its name and sample values.
     *
     * @param  mixed[] $sample
     */
    public function inferColumn(string $name, array $sample): ColumnMeta
    {
        $total   = count($sample);
        $nonNull = array_filter($sample, fn($v) => $v !== null && $v !== '');
        $nnCount = count($nonNull);

        if ($total === 0 || $nnCount === 0) {
            return new ColumnMeta($name, ColumnMeta::TYPE_TEXT, 0, 0, 0, $total, true);
        }

        // ── Numeric ratio ──────────────────────────────────────────────────
        $numericValues = array_filter($nonNull, fn($v) => is_numeric($v));
        $numericRatio  = count($numericValues) / $nnCount;

        // ── Cardinality ────────────────────────────────────────────────
        $distinct       = count(array_unique(array_map('strval', $nonNull)));
        $cardinalityRatio = $distinct / $nnCount;
        $nullable        = $nnCount < $total;

        // ── Node 1: Temporal patterns ─────────────────────────────────
        if (preg_match(self::TIME_PATTERNS, $name)) {
            $parsed = array_filter($nonNull, fn($v) => $this->isDateLike($v));
            if (count($parsed) / $nnCount > 0.7) {
                return new ColumnMeta($name, ColumnMeta::TYPE_TIME, $numericRatio, $cardinalityRatio, $distinct, $total, $nullable);
            }
        }

        // ── Node 2: ID fields ───────────────────────────────────────────
        if (preg_match(self::ID_PATTERNS, $name) && $cardinalityRatio > 0.85) {
            return new ColumnMeta($name, ColumnMeta::TYPE_ID, $numericRatio, $cardinalityRatio, $distinct, $total, $nullable);
        }

        // ── Node 3: Named metrics ───────────────────────────────────────
        if ($numericRatio > 0.9 && preg_match(self::METRIC_PATTERNS, $name)) {
            return new ColumnMeta($name, ColumnMeta::TYPE_METRIC, $numericRatio, $cardinalityRatio, $distinct, $total, $nullable);
        }

        // ── Node 4: Named dimensions ─────────────────────────────────
        if ($cardinalityRatio < 0.05 && $distinct <= 50 && preg_match(self::DIMENSION_PATTERNS, $name)) {
            return new ColumnMeta($name, ColumnMeta::TYPE_DIMENSION, $numericRatio, $cardinalityRatio, $distinct, $total, $nullable);
        }

        // ── Node 5: Statistical fallback for numerics (METRIC) ─────────────
        if ($numericRatio > 0.85 && $cardinalityRatio > 0.2) {
            return new ColumnMeta($name, ColumnMeta::TYPE_METRIC, $numericRatio, $cardinalityRatio, $distinct, $total, $nullable);
        }

        // ── Node 6: Statistical fallback for low-cardinality (DIMENSION) ──────
        if ($cardinalityRatio < 0.05 && $distinct <= 100) {
            return new ColumnMeta($name, ColumnMeta::TYPE_DIMENSION, $numericRatio, $cardinalityRatio, $distinct, $total, $nullable);
        }

        // ── Node 7: Default ───────────────────────────────────────────────
        return new ColumnMeta($name, ColumnMeta::TYPE_TEXT, $numericRatio, $cardinalityRatio, $distinct, $total, $nullable);
    }

    private function isDateLike(mixed $value): bool
    {
        if (!is_string($value) && !is_int($value)) return false;
        // ISO dates, common formats
        return preg_match('/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/', (string) $value) === 1
            || (is_int($value) && $value > 1_000_000_000 && $value < 2_000_000_000); // Unix timestamp
    }
}

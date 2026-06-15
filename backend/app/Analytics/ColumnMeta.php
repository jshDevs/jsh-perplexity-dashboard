<?php

namespace App\Analytics;

/**
 * Represents inferred metadata for a single column.
 */
class ColumnMeta
{
    public const TYPE_METRIC    = 'METRIC';
    public const TYPE_DIMENSION = 'DIMENSION';
    public const TYPE_TIME      = 'TIME';
    public const TYPE_ID        = 'ID';
    public const TYPE_TEXT      = 'TEXT';

    public readonly string $name;
    public string $type;
    public float  $numericRatio;
    public float  $cardinalityRatio;
    public int    $distinctValues;
    public int    $totalSamples;
    public bool   $nullable;
    /** @var mixed[] $sample */
    public array  $sample = [];

    public function __construct(
        string $name,
        string $type,
        float  $numericRatio     = 0.0,
        float  $cardinalityRatio = 0.0,
        int    $distinctValues   = 0,
        int    $totalSamples     = 0,
        bool   $nullable         = false,
    ) {
        $this->name              = $name;
        $this->type              = $type;
        $this->numericRatio      = $numericRatio;
        $this->cardinalityRatio  = $cardinalityRatio;
        $this->distinctValues    = $distinctValues;
        $this->totalSamples      = $totalSamples;
        $this->nullable          = $nullable;
    }

    public function toArray(): array
    {
        return [
            'name'              => $this->name,
            'type'              => $this->type,
            'numeric_ratio'     => round($this->numericRatio, 4),
            'cardinality_ratio' => round($this->cardinalityRatio, 4),
            'distinct_values'   => $this->distinctValues,
            'total_samples'     => $this->totalSamples,
            'nullable'          => $this->nullable,
        ];
    }
}

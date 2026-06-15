<?php

namespace App\Analytics;

/**
 * Holds the complete inferred schema for a dataset.
 */
class DatasetMeta
{
    /** @var array<string, ColumnMeta> */
    private array $columns;
    private int   $rowCount;
    private string $datasetId;

    /**
     * @param array<string, ColumnMeta> $columns
     */
    public function __construct(string $datasetId, array $columns, int $rowCount = 0)
    {
        $this->datasetId = $datasetId;
        $this->columns   = $columns;
        $this->rowCount  = $rowCount;
    }

    /** @return ColumnMeta[] */
    public function getColumnsByType(string $type): array
    {
        return array_values(array_filter($this->columns, fn($c) => $c->type === $type));
    }

    /** @return ColumnMeta[] */
    public function getAllColumns(): array
    {
        return array_values($this->columns);
    }

    public function getColumn(string $name): ?ColumnMeta
    {
        return $this->columns[$name] ?? null;
    }

    public function getCardinality(string $columnName): int
    {
        return $this->columns[$columnName]?->distinctValues ?? 0;
    }

    public function getRowCount(): int
    {
        return $this->rowCount;
    }

    public function getDatasetId(): string
    {
        return $this->datasetId;
    }

    public function toArray(): array
    {
        return [
            'dataset_id' => $this->datasetId,
            'row_count'  => $this->rowCount,
            'columns'    => array_map(fn($c) => $c->toArray(), $this->columns),
            'summary'    => [
                'metrics'    => count($this->getColumnsByType(ColumnMeta::TYPE_METRIC)),
                'dimensions' => count($this->getColumnsByType(ColumnMeta::TYPE_DIMENSION)),
                'time_cols'  => count($this->getColumnsByType(ColumnMeta::TYPE_TIME)),
                'ids'        => count($this->getColumnsByType(ColumnMeta::TYPE_ID)),
                'text_cols'  => count($this->getColumnsByType(ColumnMeta::TYPE_TEXT)),
            ],
        ];
    }
}

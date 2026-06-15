<?php

namespace Tests\Unit\Analytics;

use App\Analytics\ColumnMeta;
use App\Analytics\SchemaInferenceEngine;
use App\Exceptions\SchemaInferenceException;
use PHPUnit\Framework\TestCase;

class SchemaInferenceEngineTest extends TestCase
{
    private SchemaInferenceEngine $engine;

    protected function setUp(): void
    {
        parent::setUp();
        $this->engine = new SchemaInferenceEngine(sampleSize: 100);
    }

    // ── inferFromRows ───────────────────────────────────────────────

    public function test_empty_rows_throws(): void
    {
        $this->expectException(SchemaInferenceException::class);
        $this->engine->inferFromRows([]);
    }

    public function test_infers_metric_for_revenue_column(): void
    {
        $rows  = $this->makeRows('revenue', [100.0, 200.0, 300.0, 150.5, 99.0]);
        $schema = $this->engine->inferFromRows($rows);
        $this->assertSame(ColumnMeta::TYPE_METRIC, $schema['revenue']->type);
    }

    public function test_infers_dimension_for_status_column(): void
    {
        $values = array_fill(0, 50, null);
        $statuses = ['active', 'inactive', 'pending'];
        foreach ($values as $k => $_) {
            $values[$k] = $statuses[$k % 3];
        }
        $rows   = $this->makeRows('status', $values);
        $schema = $this->engine->inferFromRows($rows);
        $this->assertSame(ColumnMeta::TYPE_DIMENSION, $schema['status']->type);
    }

    public function test_infers_time_for_order_date_column(): void
    {
        $dates = [];
        for ($i = 0; $i < 30; $i++) {
            $dates[] = date('Y-m-d', strtotime("-{$i} days"));
        }
        $rows   = $this->makeRows('order_date', $dates);
        $schema = $this->engine->inferFromRows($rows);
        $this->assertSame(ColumnMeta::TYPE_TIME, $schema['order_date']->type);
    }

    public function test_infers_id_for_customer_id_column(): void
    {
        $ids    = range(1, 50);
        $rows   = $this->makeRows('customer_id', $ids);
        $schema = $this->engine->inferFromRows($rows);
        $this->assertSame(ColumnMeta::TYPE_ID, $schema['customer_id']->type);
    }

    public function test_numeric_ratio_is_accurate(): void
    {
        $values = array_merge(array_fill(0, 90, 42.5), array_fill(0, 10, 'text'));
        $col    = $this->engine->inferColumn('amount', $values);
        $this->assertEqualsWithDelta(0.9, $col->numericRatio, 0.01);
    }

    public function test_nullable_detection(): void
    {
        $values = array_merge(array_fill(0, 80, 10), array_fill(0, 20, null));
        $col    = $this->engine->inferColumn('price', $values);
        $this->assertTrue($col->nullable);
    }

    public function test_full_sales_dataset(): void
    {
        $rows = [];
        for ($i = 0; $i < 100; $i++) {
            $rows[] = [
                'order_id'   => $i + 1,
                'order_date' => date('Y-m-d', strtotime("-{$i} days")),
                'category'   => ['Electronics', 'Clothing', 'Food'][$i % 3],
                'revenue'    => rand(10, 500) + rand(0, 99) / 100,
                'qty'        => rand(1, 20),
            ];
        }
        $schema = $this->engine->inferFromRows($rows);

        $this->assertSame(ColumnMeta::TYPE_ID,        $schema['order_id']->type);
        $this->assertSame(ColumnMeta::TYPE_TIME,      $schema['order_date']->type);
        $this->assertSame(ColumnMeta::TYPE_DIMENSION, $schema['category']->type);
        $this->assertSame(ColumnMeta::TYPE_METRIC,    $schema['revenue']->type);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private function makeRows(string $column, array $values): array
    {
        return array_map(fn($v) => [$column => $v], $values);
    }
}

<?php

namespace Tests\Unit\Analytics;

use App\Analytics\ChartSelectorEngine;
use App\Analytics\ColumnMeta;
use App\Analytics\DatasetMeta;
use PHPUnit\Framework\TestCase;

class ChartSelectorEngineTest extends TestCase
{
    private ChartSelectorEngine $selector;

    protected function setUp(): void
    {
        parent::setUp();
        $this->selector = new ChartSelectorEngine(
            maxPieCategories: 5,
            maxBarCategories: 20,
            canvasThreshold: 1000
        );
    }

    public function test_kpi_for_metrics_only(): void
    {
        $meta = $this->buildMeta([ColumnMeta::TYPE_METRIC], [], 0, 100);
        $rec  = $this->selector->recommend($meta);
        $this->assertSame('kpi', $rec->type);
    }

    public function test_line_for_time_series(): void
    {
        $meta = $this->buildMeta([ColumnMeta::TYPE_METRIC], [ColumnMeta::TYPE_TIME], 0, 200);
        $rec  = $this->selector->recommend($meta);
        $this->assertStringContainsString('line', $rec->type);
    }

    public function test_pie_for_low_cardinality_dimension(): void
    {
        $meta = $this->buildMeta([ColumnMeta::TYPE_METRIC], [], 3, 50);
        $rec  = $this->selector->recommend($meta);
        $this->assertSame('pie', $rec->type);
    }

    public function test_bar_for_medium_cardinality(): void
    {
        $meta = $this->buildMeta([ColumnMeta::TYPE_METRIC], [], 10, 50);
        $rec  = $this->selector->recommend($meta);
        $this->assertSame('bar', $rec->type);
    }

    public function test_treemap_for_high_cardinality(): void
    {
        $meta = $this->buildMeta([ColumnMeta::TYPE_METRIC], [], 100, 1000);
        $rec  = $this->selector->recommend($meta);
        $this->assertSame('treemap', $rec->type);
    }

    public function test_scatter_for_two_metrics(): void
    {
        $columns = [];
        for ($i = 0; $i < 2; $i++) {
            $col = new ColumnMeta("metric_{$i}", ColumnMeta::TYPE_METRIC);
            $columns["metric_{$i}"] = $col;
        }
        $meta = new DatasetMeta('test', $columns, 100);
        $rec  = $this->selector->recommend($meta);
        $this->assertSame('scatter', $rec->type);
    }

    public function test_canvas_renderer_for_large_dataset(): void
    {
        $meta = $this->buildMeta([ColumnMeta::TYPE_METRIC], [ColumnMeta::TYPE_TIME], 0, 5000);
        $rec  = $this->selector->recommend($meta);
        $this->assertSame('canvas', $rec->renderer);
    }

    public function test_svg_renderer_for_small_dataset(): void
    {
        $meta = $this->buildMeta([ColumnMeta::TYPE_METRIC], [ColumnMeta::TYPE_TIME], 0, 100);
        $rec  = $this->selector->recommend($meta);
        $this->assertSame('svg', $rec->renderer);
    }

    public function test_table_fallback(): void
    {
        // Complex dataset with many text cols -> table
        $columns = [];
        for ($i = 0; $i < 5; $i++) {
            $col = new ColumnMeta("text_{$i}", ColumnMeta::TYPE_TEXT);
            $columns["text_{$i}"] = $col;
        }
        $meta = new DatasetMeta('test', $columns, 100);
        $rec  = $this->selector->recommend($meta);
        $this->assertSame('table', $rec->type);
    }

    // ── Helpers ──────────────────────────────────────────────────

    private function buildMeta(array $metricTypes, array $extraTypes, int $dimCardinality, int $rowCount): DatasetMeta
    {
        $columns = [];
        foreach ($metricTypes as $i => $type) {
            $col = new ColumnMeta("m_{$i}", $type);
            $columns["m_{$i}"] = $col;
        }
        foreach ($extraTypes as $i => $type) {
            $col = new ColumnMeta("e_{$i}", $type);
            $col->distinctValues = $dimCardinality;
            $columns["e_{$i}"] = $col;
        }
        if ($dimCardinality > 0) {
            $col = new ColumnMeta('category', ColumnMeta::TYPE_DIMENSION);
            $col->distinctValues = $dimCardinality;
            $columns['category'] = $col;
        }
        return new DatasetMeta('test', $columns, $rowCount);
    }
}

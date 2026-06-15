<?php

namespace App\Analytics;

/**
 * Deterministic 7-node decision tree for automatic chart type selection.
 * Based on Draco constraints and Vega-Lite grammar rules.
 * O(1) complexity, no ML/LLM required.
 */
class ChartSelectorEngine
{
    private int $maxPieCategories;
    private int $maxBarCategories;
    private int $canvasThreshold;

    public function __construct(
        int $maxPieCategories = 5,
        int $maxBarCategories = 20,
        int $canvasThreshold  = 1000
    ) {
        $this->maxPieCategories = $maxPieCategories;
        $this->maxBarCategories = $maxBarCategories;
        $this->canvasThreshold  = $canvasThreshold;
    }

    public function recommend(DatasetMeta $meta): ChartRecommendation
    {
        $metrics    = $meta->getColumnsByType(ColumnMeta::TYPE_METRIC);
        $dimensions = $meta->getColumnsByType(ColumnMeta::TYPE_DIMENSION);
        $timeCols   = $meta->getColumnsByType(ColumnMeta::TYPE_TIME);
        $nRows      = $meta->getRowCount();
        $nMetrics   = count($metrics);
        $nDims      = count($dimensions);
        $renderer   = $nRows > $this->canvasThreshold ? 'canvas' : 'svg';

        // Node 1: Only metrics, no dimensions, no time → KPI cards
        if ($nMetrics > 0 && $nDims === 0 && empty($timeCols)) {
            return new ChartRecommendation(
                'kpi',
                ['values' => array_map(fn($m) => $m->name, $metrics)],
                'svg',
                'Multiple KPI metrics without dimensions → Big Number cards'
            );
        }

        // Node 2: Temporal dimension present → Line / Area chart
        if (!empty($timeCols)) {
            $config = [
                'x'       => $timeCols[0]->name,
                'y'       => array_map(fn($m) => $m->name, $metrics),
                'group'   => $nDims > 0 ? $dimensions[0]->name : null,
                'renderer'=> $renderer,
            ];
            $type = ($nDims > 0 && $nMetrics === 1) ? 'line_grouped' : 'line';
            return new ChartRecommendation($type, $config, $renderer, 'Time series data → Line chart');
        }

        // Node 3: 1D + 1M, classify by cardinality
        if ($nDims === 1 && $nMetrics === 1) {
            $cardinality = $meta->getCardinality($dimensions[0]->name);
            if ($cardinality <= $this->maxPieCategories) {
                return new ChartRecommendation(
                    'pie',
                    ['label' => $dimensions[0]->name, 'value' => $metrics[0]->name],
                    'svg',
                    "Low cardinality ({$cardinality} values) → Pie chart"
                );
            }
            if ($cardinality <= $this->maxBarCategories) {
                return new ChartRecommendation(
                    'bar',
                    ['x' => $dimensions[0]->name, 'y' => $metrics[0]->name],
                    $renderer,
                    "Medium cardinality ({$cardinality} values) → Bar chart"
                );
            }
            return new ChartRecommendation(
                'treemap',
                ['label' => $dimensions[0]->name, 'value' => $metrics[0]->name],
                $renderer,
                "High cardinality ({$cardinality} values) → Treemap"
            );
        }

        // Node 4: 1D + multiple M → Grouped/Stacked bar
        if ($nDims === 1 && $nMetrics > 1) {
            return new ChartRecommendation(
                'bar_grouped',
                [
                    'x'       => $dimensions[0]->name,
                    'y'       => array_map(fn($m) => $m->name, $metrics),
                    'stacked' => false,
                ],
                $renderer,
                '1 dimension + multiple metrics → Grouped bar chart'
            );
        }

        // Node 5: 2M, 0-1D → Scatter plot
        if ($nMetrics === 2 && $nDims <= 1) {
            return new ChartRecommendation(
                'scatter',
                [
                    'x'     => $metrics[0]->name,
                    'y'     => $metrics[1]->name,
                    'color' => $nDims > 0 ? $dimensions[0]->name : null,
                ],
                $renderer,
                '2 metrics → Scatter plot for correlation analysis'
            );
        }

        // Node 6: 2+ D + 1+ M → Heatmap
        if ($nDims >= 2 && $nMetrics >= 1) {
            return new ChartRecommendation(
                'heatmap',
                [
                    'x'     => $dimensions[0]->name,
                    'y'     => $dimensions[1]->name,
                    'value' => $metrics[0]->name,
                ],
                $renderer,
                'Multiple dimensions → Heatmap'
            );
        }

        // Node 7: Fallback → interactive table
        return new ChartRecommendation(
            'table',
            ['columns' => array_map(fn($c) => $c->name, $meta->getAllColumns())],
            'svg',
            'Complex/unrecognized structure → Data table'
        );
    }
}

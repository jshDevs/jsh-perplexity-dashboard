<?php

namespace App\Analytics;

/**
 * Represents a chart type recommendation with its configuration.
 */
class ChartRecommendation
{
    public readonly string $type;
    public readonly array  $config;
    public readonly string $renderer;
    public readonly string $rationale;

    public function __construct(string $type, array $config, string $renderer = 'canvas', string $rationale = '')
    {
        $this->type      = $type;
        $this->config    = $config;
        $this->renderer  = $renderer;
        $this->rationale = $rationale;
    }

    public function toArray(): array
    {
        return [
            'chart_type' => $this->type,
            'config'     => $this->config,
            'renderer'   => $this->renderer,
            'rationale'  => $this->rationale,
        ];
    }
}

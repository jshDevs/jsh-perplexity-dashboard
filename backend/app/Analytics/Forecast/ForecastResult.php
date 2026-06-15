<?php

namespace App\Analytics\Forecast;

/**
 * Value object for forecast results.
 */
class ForecastResult
{
    /** @param float[] $smoothed  In-sample fitted values */
    /** @param float[] $forecast  Out-of-sample predictions */
    public function __construct(
        public readonly array $smoothed,
        public readonly array $forecast,
        public readonly float $mape,
        public readonly float $rmse,
        public readonly string $algorithm,
    ) {}

    public function toArray(): array
    {
        return [
            'algorithm'      => $this->algorithm,
            'smoothed'       => array_map(fn($v) => round($v, 4), $this->smoothed),
            'forecast'       => array_map(fn($v) => round($v, 4), $this->forecast),
            'forecast_count' => count($this->forecast),
            'accuracy'       => [
                'mape' => round($this->mape, 2),
                'rmse' => round($this->rmse, 4),
            ],
        ];
    }
}

<?php

namespace App\Analytics\Forecast;

use InvalidArgumentException;

/**
 * Holt-Winters Triple Exponential Smoothing (Additive).
 * Pure PHP implementation, no external dependencies.
 *
 * Equation: y_hat(t+h) = (L_t + h * B_t) * S_{t+h-m*floor((h-1)/m)}
 * where L=level, B=trend, S=seasonal component.
 */
class HoltWintersForecast
{
    /**
     * Fit model and generate forecast.
     *
     * @param  float[] $series   Historical time series (must have >= 2 * $season points)
     * @param  int     $season   Season length (12=monthly, 4=quarterly, 7=weekly)
     * @param  int     $horizon  Periods to forecast ahead
     * @param  float   $alpha    Level smoothing (0 < α < 1)
     * @param  float   $beta     Trend smoothing  (0 < β < 1)
     * @param  float   $gamma    Seasonal smoothing (0 < γ < 1)
     * @throws InvalidArgumentException
     */
    public function forecast(
        array $series,
        int   $season,
        int   $horizon,
        float $alpha = 0.3,
        float $beta  = 0.1,
        float $gamma = 0.2
    ): ForecastResult {
        $n = count($series);
        if ($n < 2 * $season) {
            throw new InvalidArgumentException(
                "Holt-Winters requires at least 2 full seasons ({$season}x2 = " . (2 * $season) . " data points). Got {$n}."
            );
        }
        if ($season < 2) {
            throw new InvalidArgumentException('Season length must be >= 2');
        }

        // ── Initialisation ────────────────────────────────────────────────
        $initLevel = array_sum(array_slice($series, 0, $season)) / $season;
        $initTrend = (
            array_sum(array_slice($series, $season, $season)) -
            array_sum(array_slice($series, 0, $season))
        ) / ($season * $season);

        // Initial seasonal indices (multiplicative relative to mean)
        $seasonal = [];
        for ($i = 0; $i < $season; $i++) {
            $seasonal[$i] = $initLevel > 0 ? $series[$i] / $initLevel : 1.0;
        }

        $level    = $initLevel;
        $trend    = $initTrend;
        $smoothed = [];

        // ── Smoothing pass ────────────────────────────────────────────────
        for ($t = 0; $t < $n; $t++) {
            $s          = $seasonal[$t % $season];
            $prevLevel  = $level;
            $prevTrend  = $trend;

            $level    = $alpha * ($s > 0 ? $series[$t] / $s : $series[$t]) + (1 - $alpha) * ($prevLevel + $prevTrend);
            $trend    = $beta  * ($level - $prevLevel) + (1 - $beta) * $prevTrend;
            $seasonal[$t % $season] = $gamma * ($level > 0 ? $series[$t] / $level : 1.0) + (1 - $gamma) * $s;
            $smoothed[$t]           = ($level + $trend) * $seasonal[$t % $season];
        }

        // ── Forecast ────────────────────────────────────────────────────
        $forecasted = [];
        for ($h = 1; $h <= $horizon; $h++) {
            $seasonIdx    = ($n + $h - 1) % $season;
            $forecasted[] = ($level + $h * $trend) * $seasonal[$seasonIdx];
        }

        return new ForecastResult(
            smoothed:  $smoothed,
            forecast:  $forecasted,
            mape:      $this->mape($series, $smoothed),
            rmse:      $this->rmse($series, $smoothed),
            algorithm: 'holt_winters_additive',
        );
    }

    /**
     * Simple Moving Average fallback.
     *
     * @param float[] $series
     */
    public function sma(array $series, int $period, int $horizon): ForecastResult
    {
        $n   = count($series);
        $smoothed = [];

        for ($i = 0; $i < $n; $i++) {
            if ($i < $period - 1) {
                $smoothed[] = $series[$i];
                continue;
            }
            $smoothed[] = array_sum(array_slice($series, $i - $period + 1, $period)) / $period;
        }

        $lastMean   = array_sum(array_slice($series, -$period)) / $period;
        $forecasted = array_fill(0, $horizon, $lastMean);

        return new ForecastResult(
            smoothed:  $smoothed,
            forecast:  $forecasted,
            mape:      $this->mape($series, $smoothed),
            rmse:      $this->rmse($series, $smoothed),
            algorithm: "sma_{$period}",
        );
    }

    // ── Accuracy metrics ────────────────────────────────────────────────

    /** @param float[] $actual @param float[] $predicted */
    public function mape(array $actual, array $predicted): float
    {
        $n = min(count($actual), count($predicted));
        if ($n === 0) return 0.0;
        $sum = 0.0;
        $cnt = 0;
        for ($i = 0; $i < $n; $i++) {
            if ($actual[$i] != 0) {
                $sum += abs(($actual[$i] - $predicted[$i]) / $actual[$i]);
                $cnt++;
            }
        }
        return $cnt > 0 ? round(($sum / $cnt) * 100, 2) : 0.0;
    }

    /** @param float[] $actual @param float[] $predicted */
    public function rmse(array $actual, array $predicted): float
    {
        $n = min(count($actual), count($predicted));
        if ($n === 0) return 0.0;
        $sum = 0.0;
        for ($i = 0; $i < $n; $i++) {
            $sum += ($actual[$i] - $predicted[$i]) ** 2;
        }
        return round(sqrt($sum / $n), 4);
    }
}

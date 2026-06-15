<?php

namespace App\Analytics\Anomaly;

/**
 * Statistical anomaly detection without ML.
 * Implements: IQR, Z-score, Modified Z-score (MAD), Moving Z-score, CUSUM.
 */
class StatisticalAnomalyDetector
{
    private int   $windowSize;
    private float $threshold;

    public function __construct(int $windowSize = 20, float $threshold = 2.5)
    {
        $this->windowSize = $windowSize;
        $this->threshold  = $threshold;
    }

    /**
     * Auto-select best algorithm based on series properties.
     *
     * @param  float[] $values
     * @param  string  $algorithm  iqr|zscore|modified_zscore|moving_zscore|cusum|auto
     * @return array{anomalies: bool[], scores: float[], algorithm: string}
     */
    public function detect(array $values, string $algorithm = 'auto'): array
    {
        if ($algorithm === 'auto') {
            $algorithm = $this->selectAlgorithm($values);
        }

        [$anomalies, $scores] = match ($algorithm) {
            'iqr'           => $this->iqr($values),
            'zscore'        => $this->zscore($values),
            'modified_zscore' => $this->modifiedZScore($values),
            'moving_zscore' => $this->movingZScore($values),
            'cusum'         => $this->cusum($values),
            default         => $this->movingZScore($values),
        };

        return [
            'anomalies' => $anomalies,
            'scores'    => $scores,
            'algorithm' => $algorithm,
            'count'     => count(array_filter($anomalies)),
        ];
    }

    /**
     * Select algorithm automatically based on series properties.
     *
     * @param float[] $values
     */
    private function selectAlgorithm(array $values): string
    {
        $n = count($values);
        if ($n < 8)  return 'iqr';
        if ($n < 30) return 'modified_zscore';
        return 'moving_zscore'; // Best for time series with local context
    }

    /**
     * IQR method — best for non-normal distributions.
     *
     * @param  float[] $values
     * @return array{bool[], float[]}
     */
    public function iqr(array $values, float $factor = 1.5): array
    {
        $sorted = $values;
        sort($sorted);
        $n   = count($sorted);
        $q1  = $sorted[(int) floor($n * 0.25)];
        $q3  = $sorted[(int) floor($n * 0.75)];
        $iqr = $q3 - $q1;

        $lower = $q1 - $factor * $iqr;
        $upper = $q3 + $factor * $iqr;

        $anomalies = [];
        $scores    = [];
        foreach ($values as $v) {
            $score      = max(0, $v < $lower ? ($lower - $v) / ($iqr ?: 1) : ($v - $upper) / ($iqr ?: 1));
            $anomalies[] = $v < $lower || $v > $upper;
            $scores[]    = round($score, 4);
        }

        return [$anomalies, $scores];
    }

    /**
     * Standard Z-score.
     *
     * @param  float[] $values
     * @return array{bool[], float[]}
     */
    public function zscore(array $values, ?float $threshold = null): array
    {
        $t    = $threshold ?? $this->threshold;
        $mean = array_sum($values) / count($values);
        $std  = $this->stdDev($values, $mean);

        $anomalies = [];
        $scores    = [];
        foreach ($values as $v) {
            $score       = $std > 0 ? abs($v - $mean) / $std : 0.0;
            $anomalies[] = $score > $t;
            $scores[]    = round($score, 4);
        }

        return [$anomalies, $scores];
    }

    /**
     * Modified Z-score using MAD — more robust to existing outliers.
     *
     * @param  float[] $values
     * @return array{bool[], float[]}
     */
    public function modifiedZScore(array $values, float $threshold = 3.5): array
    {
        $median = $this->median($values);
        $mad    = $this->median(array_map(fn($v) => abs($v - $median), $values));

        $anomalies = [];
        $scores    = [];
        foreach ($values as $v) {
            $score       = $mad > 0 ? 0.6745 * abs($v - $median) / $mad : 0.0;
            $anomalies[] = $score > $threshold;
            $scores[]    = round($score, 4);
        }

        return [$anomalies, $scores];
    }

    /**
     * Moving Z-score with sliding window — best for time series.
     *
     * @param  float[] $values
     * @return array{bool[], float[]}
     */
    public function movingZScore(array $values, ?int $window = null, ?float $threshold = null): array
    {
        $w   = $window    ?? $this->windowSize;
        $t   = $threshold ?? $this->threshold;
        $n   = count($values);

        $anomalies = array_fill(0, $n, false);
        $scores    = array_fill(0, $n, 0.0);

        for ($i = $w; $i < $n; $i++) {
            $slice = array_slice($values, $i - $w, $w);
            $mean  = array_sum($slice) / $w;
            $std   = $this->stdDev($slice, $mean);

            if ($std > 0) {
                $score          = abs($values[$i] - $mean) / $std;
                $anomalies[$i]  = $score > $t;
                $scores[$i]     = round($score, 4);
            }
        }

        return [$anomalies, $scores];
    }

    /**
     * CUSUM control chart for detecting shifts in mean.
     *
     * @param  float[] $values
     * @return array{bool[], float[]}
     */
    public function cusum(array $values, float $k = 0.5, float $h = 5.0): array
    {
        $n    = count($values);
        $mean = array_sum($values) / $n;
        $std  = $this->stdDev($values, $mean);

        $cPos      = 0.0;
        $cNeg      = 0.0;
        $anomalies = [];
        $scores    = [];

        foreach ($values as $v) {
            $normalized = $std > 0 ? ($v - $mean) / $std : 0.0;
            $cPos       = max(0, $cPos + $normalized - $k);
            $cNeg       = max(0, $cNeg - $normalized - $k);
            $score      = max($cPos, $cNeg);
            $anomalies[] = $score > $h;
            $scores[]    = round($score, 4);
        }

        return [$anomalies, $scores];
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /** @param float[] $values */
    private function median(array $values): float
    {
        $sorted = $values;
        sort($sorted);
        $n = count($sorted);
        if ($n === 0) return 0.0;
        return $n % 2 === 0
            ? ($sorted[$n / 2 - 1] + $sorted[$n / 2]) / 2
            : $sorted[(int) ($n / 2)];
    }

    /** @param float[] $values */
    private function stdDev(array $values, float $mean): float
    {
        $n = count($values);
        if ($n === 0) return 0.0;
        $variance = array_sum(array_map(fn($v) => ($v - $mean) ** 2, $values)) / $n;
        return sqrt($variance);
    }
}

<?php

namespace Tests\Unit\Analytics;

use App\Analytics\Anomaly\StatisticalAnomalyDetector;
use PHPUnit\Framework\TestCase;

class AnomalyDetectorTest extends TestCase
{
    private StatisticalAnomalyDetector $detector;

    protected function setUp(): void
    {
        parent::setUp();
        $this->detector = new StatisticalAnomalyDetector(windowSize: 10, threshold: 2.5);
    }

    public function test_iqr_detects_outliers(): void
    {
        $values = array_merge(array_fill(0, 20, 100.0), [9999.0]);
        $result = $this->detector->iqr($values);
        [$anomalies] = $result;
        $this->assertTrue($anomalies[20], 'IQR should flag 9999 as an outlier');
        $this->assertFalse($anomalies[0], 'Normal value should not be flagged');
    }

    public function test_zscore_detects_spike(): void
    {
        $normal = array_fill(0, 30, 50.0);
        $normal[15] = 9999.0;
        [$anomalies] = $this->detector->zscore($normal);
        $this->assertTrue($anomalies[15]);
    }

    public function test_modified_zscore_robust_to_existing_outliers(): void
    {
        // MAD-based method should still detect new outlier when others already present
        $values = array_fill(0, 30, 100.0);
        $values[5]  = 500.0;   // Existing outlier
        $values[25] = 9999.0;  // New anomaly
        [$anomalies] = $this->detector->modifiedZScore($values);
        $this->assertTrue($anomalies[25]);
    }

    public function test_moving_zscore_with_local_context(): void
    {
        $values = array_fill(0, 40, 100.0);
        $values[35] = 9999.0;
        [$anomalies] = $this->detector->movingZScore($values);
        $this->assertTrue($anomalies[35]);
    }

    public function test_cusum_detects_mean_shift(): void
    {
        // Normal for 20 points then shift to 200
        $normal = array_fill(0, 20, 100.0);
        $shifted = array_fill(0, 20, 200.0);
        $values  = array_merge($normal, $shifted);
        [$anomalies] = $this->detector->cusum($values);
        // Should detect shift in the second half
        $secondHalf = array_slice($anomalies, 20);
        $this->assertTrue(in_array(true, $secondHalf, true), 'CUSUM should detect mean shift');
    }

    public function test_auto_selects_iqr_for_small_series(): void
    {
        $values = [10, 11, 12, 1000, 13];
        $result = $this->detector->detect($values, 'auto');
        $this->assertSame('iqr', $result['algorithm']);
    }

    public function test_count_matches_flagged_anomalies(): void
    {
        $values = array_merge(array_fill(0, 50, 100.0), [9999.0, 0.001]);
        $result = $this->detector->detect($values, 'modified_zscore');
        $this->assertSame(
            count(array_filter($result['anomalies'])),
            $result['count']
        );
    }
}

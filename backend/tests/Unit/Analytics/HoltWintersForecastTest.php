<?php

namespace Tests\Unit\Analytics;

use App\Analytics\Forecast\HoltWintersForecast;
use PHPUnit\Framework\TestCase;

class HoltWintersForecastTest extends TestCase
{
    private HoltWintersForecast $forecaster;

    protected function setUp(): void
    {
        parent::setUp();
        $this->forecaster = new HoltWintersForecast();
    }

    public function test_throws_on_insufficient_data(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->forecaster->forecast([1, 2, 3], 12, 6);
    }

    public function test_forecast_returns_correct_horizon(): void
    {
        $series  = $this->generateSeasonalSeries(48, 12);
        $result  = $this->forecaster->forecast($series, 12, 12);
        $this->assertCount(12, $result->forecast);
    }

    public function test_smoothed_length_matches_input(): void
    {
        $series = $this->generateSeasonalSeries(48, 12);
        $result = $this->forecaster->forecast($series, 12, 6);
        $this->assertCount(48, $result->smoothed);
    }

    public function test_mape_below_50_on_simple_seasonal(): void
    {
        // A very regular seasonal series should have reasonable MAPE
        $series = [];
        for ($i = 0; $i < 48; $i++) {
            $series[] = 100 + 20 * sin(2 * M_PI * $i / 12);
        }
        $result = $this->forecaster->forecast($series, 12, 12);
        $this->assertLessThan(50.0, $result->mape, 'MAPE should be below 50% on regular seasonal data');
    }

    public function test_sma_fallback_returns_correct_horizon(): void
    {
        $series = range(1, 30);
        $result = $this->forecaster->sma(array_map('floatval', $series), 7, 10);
        $this->assertCount(10, $result->forecast);
        $this->assertSame('sma_7', $result->algorithm);
    }

    public function test_rmse_is_nonnegative(): void
    {
        $series = $this->generateSeasonalSeries(36, 12);
        $result = $this->forecaster->forecast($series, 12, 6);
        $this->assertGreaterThanOrEqual(0.0, $result->rmse);
    }

    public function test_result_serializes_to_array(): void
    {
        $series = $this->generateSeasonalSeries(24, 12);
        $result = $this->forecaster->forecast($series, 12, 6);
        $arr    = $result->toArray();
        $this->assertArrayHasKey('algorithm', $arr);
        $this->assertArrayHasKey('forecast',  $arr);
        $this->assertArrayHasKey('accuracy',  $arr);
        $this->assertArrayHasKey('mape',      $arr['accuracy']);
    }

    private function generateSeasonalSeries(int $length, int $season): array
    {
        $series = [];
        for ($i = 0; $i < $length; $i++) {
            $series[] = 100.0 + 30.0 * sin(2 * M_PI * $i / $season) + rand(-5, 5);
        }
        return $series;
    }
}

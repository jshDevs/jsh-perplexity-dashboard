<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Yaml\Yaml;

class DashboardSeeder extends Seeder
{
    public function run(): void
    {
        // Create sample dashboard YAML files
        $dashboardsPath = storage_path('dashboards');
        if (!is_dir($dashboardsPath)) mkdir($dashboardsPath, 0755, true);

        $metricsPath = storage_path('metrics');
        if (!is_dir($metricsPath)) mkdir($metricsPath, 0755, true);

        $dataPath = storage_path('data');
        if (!is_dir($dataPath)) mkdir($dataPath, 0755, true);

        // Sample metrics registry
        $metrics = [
            'measures' => [
                'revenue' => [
                    'expression' => 'SUM(price * qty)',
                    'label'      => 'Ingresos Totales',
                    'format'     => 'currency',
                ],
                'orders_count' => [
                    'expression' => 'COUNT(*)',
                    'label'      => 'Número de Órdenes',
                    'format'     => 'number',
                ],
                'avg_order_value' => [
                    'expression' => 'AVG(price * qty)',
                    'label'      => 'Valor Promedio de Orden',
                    'format'     => 'currency',
                ],
            ],
        ];
        file_put_contents($metricsPath . '/business_metrics.yaml', Yaml::dump($metrics, 4));

        // Sample sales dashboard YAML
        $salesDashboard = [
            'version'     => '1.0',
            'title'       => 'Dashboard de Ventas',
            'description' => 'Análisis de ventas por categoría y región',
            'datasource'  => [
                'type'  => 'duckdb',
                'path'  => storage_path('data/sample_sales.csv'),
            ],
            'time_dimension' => [
                'column'        => 'order_date',
                'granularities' => ['day', 'week', 'month'],
            ],
            'dimensions' => [
                ['name' => 'category', 'column' => 'category', 'label' => 'Categoría', 'filter_type' => 'multiselect'],
                ['name' => 'region',   'column' => 'region',   'label' => 'Región',    'filter_type' => 'multiselect'],
            ],
            'measures' => [
                ['name' => 'revenue',      'expression' => 'SUM(price * qty)', 'label' => 'Ingresos',  'format' => 'currency'],
                ['name' => 'orders_count', 'expression' => 'COUNT(*)',          'label' => 'Órdenes',   'format' => 'number'],
            ],
            'filters' => [
                ['field' => 'order_date', 'type' => 'daterange', 'default' => 'last_30_days'],
            ],
        ];
        file_put_contents($dashboardsPath . '/ventas.yaml', Yaml::dump($salesDashboard, 4));

        // Generate sample CSV data
        $this->generateSampleCsv($dataPath . '/sample_sales.csv');

        // Register in DB
        DB::table('dashboard_configs')->insertOrIgnore([
            'slug'       => 'ventas',
            'title'      => 'Dashboard de Ventas',
            'yaml_path'  => $dashboardsPath . '/ventas.yaml',
            'is_active'  => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->command->info('Dashboard seeder completed. Sample data generated.');
    }

    private function generateSampleCsv(string $path): void
    {
        $categories = ['Electronics', 'Clothing', 'Food', 'Sports', 'Books'];
        $regions    = ['Norte', 'Sur', 'Oriente', 'Occidente', 'Centro'];
        $handle     = fopen($path, 'w');

        fputcsv($handle, ['order_id', 'order_date', 'category', 'region', 'price', 'qty', 'customer_id']);

        $date = new \DateTime('-12 months');
        for ($i = 1; $i <= 1000; $i++) {
            $date->modify('+' . rand(0, 2) . ' days');
            fputcsv($handle, [
                $i,
                $date->format('Y-m-d'),
                $categories[array_rand($categories)],
                $regions[array_rand($regions)],
                round(rand(10, 500) + rand(0, 99) / 100, 2),
                rand(1, 20),
                'CUST-' . rand(1, 200),
            ]);
        }
        fclose($handle);
    }
}

<?php

namespace App\Services;

use App\Exceptions\SecurityException;
use Symfony\Component\Yaml\Yaml;
use Illuminate\Support\Facades\Cache;

/**
 * Loads and resolves metric definitions from YAML files.
 * Supports SQL template parameters: {{param_name}}
 */
class MetricsRegistry
{
    private array $measures        = [];
    private array $virtualDatasets = [];
    private bool  $loaded          = false;

    public function load(string $yamlPath): void
    {
        if (!file_exists($yamlPath)) {
            throw new \InvalidArgumentException("Metrics file not found: {$yamlPath}");
        }

        $data = Yaml::parseFile($yamlPath);

        $this->measures        = $data['measures']        ?? [];
        $this->virtualDatasets = $data['virtual_datasets'] ?? [];
        $this->loaded          = true;
    }

    public function loadFromDirectory(string $dir): void
    {
        foreach (glob("{$dir}/*.yaml") as $file) {
            $this->load($file);
        }
    }

    /**
     * Resolve a metric expression with optional params.
     */
    public function resolve(string $metricName, array $params = []): string
    {
        if (!isset($this->measures[$metricName])) {
            throw new \InvalidArgumentException("Metric '{$metricName}' not found in registry");
        }

        $expression = $this->measures[$metricName]['expression']
            ?? throw new \InvalidArgumentException("Metric '{$metricName}' has no expression");

        return $this->substituteParams($expression, $params);
    }

    public function getMeasures(): array
    {
        return $this->measures;
    }

    public function getVirtualDataset(string $name, array $params = []): string
    {
        if (!isset($this->virtualDatasets[$name])) {
            throw new \InvalidArgumentException("Virtual dataset '{$name}' not found");
        }

        $query = $this->virtualDatasets[$name]['query']
            ?? throw new \InvalidArgumentException("Virtual dataset '{$name}' has no query");

        return $this->substituteParams($query, $params);
    }

    private function substituteParams(string $template, array $params): string
    {
        foreach ($params as $key => $value) {
            $safe     = $this->sanitizeParam((string) $key, $value);
            $template = str_replace('{{' . $key . '}}', $safe, $template);
        }

        // Check for unresolved params
        if (preg_match('/\{\{[a-z_]+\}\}/', $template)) {
            throw new \InvalidArgumentException('Unresolved template parameters in metric expression');
        }

        return $template;
    }

    private function sanitizeParam(string $key, mixed $value): string
    {
        if (is_null($value))    return 'NULL';
        if (is_bool($value))    return $value ? 'TRUE' : 'FALSE';
        if (is_int($value) || is_float($value)) return (string) $value;
        if (is_string($value)) {
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
                return "'{$value}'";
            }
            if (is_numeric($value)) return $value;
            // Only allow alphanumeric + underscore for string params
            if (preg_match('/^[a-zA-Z0-9_\-\.]+$/', $value)) {
                return "'{$value}'";
            }
            throw new SecurityException("Parameter '{$key}' contains invalid characters");
        }
        throw new SecurityException("Unsupported parameter type for '{$key}'");
    }
}

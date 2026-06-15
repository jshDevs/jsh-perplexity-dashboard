<?php

namespace Tests\Unit\Services;

use App\Exceptions\SecurityException;
use App\Services\SecurityValidator;
use PHPUnit\Framework\TestCase;

class SecurityValidatorTest extends TestCase
{
    private SecurityValidator $validator;

    protected function setUp(): void
    {
        parent::setUp();
        // Bootstrap config manually for unit test
        if (!function_exists('config')) {
            // For pure unit tests, use reflection to set properties
            $this->validator = new class extends SecurityValidator {
                public function __construct() {
                    $this->maxUploadMb       = 50;
                    $this->maxZipRatio       = 50;
                    $this->maxUncompressedMb = 200;
                    $this->allowedMimes      = [
                        'text/csv',
                        'text/plain',
                        'application/json',
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    ];
                }
            };
            return;
        }
        $this->validator = new SecurityValidator();
    }

    // ── SQL validation ───────────────────────────────────────────

    public function test_valid_select_passes(): void
    {
        $this->validator->validateSql('SELECT id, name FROM users WHERE status = 1');
        $this->assertTrue(true); // No exception = pass
    }

    public function test_insert_throws(): void
    {
        $this->expectException(SecurityException::class);
        $this->validator->validateSql('INSERT INTO users (name) VALUES ("test")');
    }

    public function test_drop_throws(): void
    {
        $this->expectException(SecurityException::class);
        $this->validator->validateSql('DROP TABLE users');
    }

    public function test_sleep_injection_throws(): void
    {
        $this->expectException(SecurityException::class);
        $this->validator->validateSql("SELECT * FROM users WHERE SLEEP(5)=0");
    }

    public function test_comment_injection_throws(): void
    {
        $this->expectException(SecurityException::class);
        $this->validator->validateSql('SELECT * FROM users -- ignore rest');
    }

    public function test_with_cte_passes(): void
    {
        $this->validator->validateSql('WITH base AS (SELECT * FROM orders) SELECT * FROM base');
        $this->assertTrue(true);
    }

    public function test_describe_passes(): void
    {
        $this->validator->validateSql('DESCRIBE users');
        $this->assertTrue(true);
    }

    // ── Cell sanitization ─────────────────────────────────────────

    public function test_csv_formula_injection_neutralized(): void
    {
        $evil   = '=CMD|\' /C calc\'!A0';
        $result = $this->validator->sanitizeCellValue($evil);
        $this->assertStringStartsWith("'", $result);
    }

    public function test_plus_formula_neutralized(): void
    {
        $result = $this->validator->sanitizeCellValue('+10');
        $this->assertStringStartsWith("'", $result);
    }

    public function test_safe_string_unchanged(): void
    {
        $result = $this->validator->sanitizeCellValue('Hello World');
        $this->assertSame('Hello World', $result);
    }

    public function test_numeric_unchanged(): void
    {
        $result = $this->validator->sanitizeCellValue(42);
        $this->assertSame(42, $result);
    }

    public function test_null_unchanged(): void
    {
        $result = $this->validator->sanitizeCellValue(null);
        $this->assertNull($result);
    }
}

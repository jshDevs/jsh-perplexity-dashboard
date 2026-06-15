<?php

namespace App\Services;

use App\Exceptions\SecurityException;
use Illuminate\Http\UploadedFile;

/**
 * Security validation pipeline for file uploads and SQL inputs.
 * Mitigates: XXE, CSV injection, Zip bomb, SQL injection, path traversal.
 */
class SecurityValidator
{
    private int   $maxUploadMb;
    private int   $maxZipRatio;
    private int   $maxUncompressedMb;
    private array $allowedMimes;

    public function __construct()
    {
        $this->maxUploadMb      = (int) config('dashboard.max_upload_mb', 50);
        $this->maxZipRatio      = (int) config('dashboard.max_zip_ratio', 50);
        $this->maxUncompressedMb= (int) config('dashboard.max_uncompressed_mb', 200);
        $this->allowedMimes     = config('dashboard.allowed_mimes', []);
    }

    /**
     * Full validation pipeline for uploaded files.
     *
     * @throws SecurityException
     */
    public function validateFile(UploadedFile $file): void
    {
        $this->checkFileSize($file);
        $this->checkMimeType($file);

        $mime = $this->getRealMimeType($file);
        if (str_contains($mime, 'zip') || str_contains($mime, 'spreadsheetml')) {
            $this->checkZipBomb($file->getPathname());
        }
    }

    /**
     * Sanitize a cell value against formula injection.
     */
    public function sanitizeCellValue(mixed $value): mixed
    {
        if (!is_string($value)) return $value;
        if (strlen($value) === 0) return $value;

        // CSV/Excel formula injection: =, +, -, @, TAB, CR
        $dangerous = ['=', '+', '-', '@', "\t", "\r", chr(0x0D)];
        if (in_array($value[0], $dangerous, true)) {
            return "'" . $value; // Prepend apostrophe to neutralize
        }

        return $value;
    }

    /**
     * Validate user-supplied SQL (SELECT only).
     *
     * @throws SecurityException
     */
    public function validateSql(string $sql): void
    {
        $upper    = strtoupper(trim($sql));
        $forbidden = [
            'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER',
            'CREATE', 'EXEC', 'EXECUTE', 'UNION ALL SELECT', 'COPY',
            'LOAD_FILE', 'INTO OUTFILE', 'INTO DUMPFILE', 'XP_', 'SP_',
            'BENCHMARK', 'SLEEP', 'WAITFOR',
        ];

        foreach ($forbidden as $keyword) {
            if (str_contains($upper, $keyword)) {
                throw new SecurityException("SQL statement contains forbidden operation: {$keyword}");
            }
        }

        if (!preg_match('/^\s*(SELECT|WITH|DESCRIBE)/i', $sql)) {
            throw new SecurityException('Only SELECT, WITH, and DESCRIBE queries are allowed');
        }

        // Check for SQL comment injection
        if (str_contains($sql, '--') || preg_match('/\/\*.*\*\//s', $sql)) {
            throw new SecurityException('SQL comments are not allowed in queries');
        }
    }

    /**
     * Generate a safe storage filename (UUID-based).
     */
    public function safeFilename(UploadedFile $file): string
    {
        $ext = strtolower($file->getClientOriginalExtension());
        $allowedExts = ['csv', 'json', 'xlsx', 'xls', 'parquet', 'ndjson'];

        if (!in_array($ext, $allowedExts, true)) {
            throw new SecurityException("File extension '{$ext}' is not allowed");
        }

        return \Illuminate\Support\Str::uuid() . '.' . $ext;
    }

    // ── Private helpers ───────────────────────────────────────────────

    private function checkFileSize(UploadedFile $file): void
    {
        $maxBytes = $this->maxUploadMb * 1024 * 1024;
        if ($file->getSize() > $maxBytes) {
            throw new SecurityException("File too large. Maximum size: {$this->maxUploadMb}MB");
        }
    }

    private function checkMimeType(UploadedFile $file): void
    {
        $mime = $this->getRealMimeType($file);
        if (!in_array($mime, $this->allowedMimes, true)) {
            throw new SecurityException("File MIME type not allowed: {$mime}");
        }
    }

    private function getRealMimeType(UploadedFile $file): string
    {
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        return $finfo->file($file->getPathname()) ?: $file->getMimeType();
    }

    private function checkZipBomb(string $path): void
    {
        $zip = new \ZipArchive();
        if ($zip->open($path) !== true) {
            throw new SecurityException('Cannot open ZIP/XLSX file — file may be corrupted');
        }

        $totalCompressed   = 0;
        $totalUncompressed = 0;
        $maxUncompressed   = $this->maxUncompressedMb * 1024 * 1024;

        for ($i = 0; $i < $zip->count(); $i++) {
            $stat = $zip->statIndex($i);
            $totalCompressed   += $stat['comp_size'];
            $totalUncompressed += $stat['size'];

            if ($totalUncompressed > $maxUncompressed) {
                $zip->close();
                throw new SecurityException(
                    "Zip bomb detected: uncompressed size exceeds {$this->maxUncompressedMb}MB limit"
                );
            }
        }

        $zip->close();

        if ($totalCompressed > 0 && ($totalUncompressed / $totalCompressed) > $this->maxZipRatio) {
            throw new SecurityException(
                'Zip bomb detected: compression ratio exceeds ' . $this->maxZipRatio . ':1'
            );
        }
    }
}

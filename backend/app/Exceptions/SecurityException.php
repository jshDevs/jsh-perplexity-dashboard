<?php

namespace App\Exceptions;

use RuntimeException;

class SecurityException extends RuntimeException
{
    public function __construct(string $message, int $code = 422)
    {
        parent::__construct($message, $code);
    }
}

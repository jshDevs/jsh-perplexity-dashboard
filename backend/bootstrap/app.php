<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(prepend: [
            \App\Http\Middleware\SecurityHeaders::class,
        ]);
        $middleware->alias([
            'throttle.analytics' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\App\Exceptions\SecurityException $e, $request) {
            return response()->json(['error' => $e->getMessage()], 422);
        });
        $exceptions->render(function (\App\Exceptions\SchemaInferenceException $e, $request) {
            return response()->json(['error' => $e->getMessage()], 422);
        });
    })->create();

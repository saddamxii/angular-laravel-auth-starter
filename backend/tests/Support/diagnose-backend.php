<?php

declare(strict_types=1);

function diagnostic(string $stage, callable $action): void
{
    fwrite(STDOUT, "\n========== [{$stage}] ==========\n");

    try {
        $action();
        fwrite(STDOUT, "[PASS] {$stage}\n");
    } catch (Throwable $e) {
        fwrite(STDERR, "[FAIL] {$stage}\n");
        fwrite(STDERR, sprintf("%s: %s\n", get_class($e), $e->getMessage()));
        fwrite(STDERR, $e->getTraceAsString() . "\n");
        exit(1);
    }
}

diagnostic('PHP runtime', static function (): void {
    fwrite(STDOUT, PHP_VERSION . "\n");
});

diagnostic('Composer autoload', static function (): void {
    if (!is_file(__DIR__ . '/../../vendor/autoload.php')) {
        throw new RuntimeException('vendor/autoload.php is missing');
    }
    require_once __DIR__ . '/../../vendor/autoload.php';
});

diagnostic('Laravel application bootstrap', static function (): void {
    $app = require __DIR__ . '/../../bootstrap/app.php';
    if (!$app instanceof Illuminate\Contracts\Foundation\Application) {
        throw new RuntimeException('bootstrap/app.php did not return a Laravel application');
    }
});

echo "\n========== DIAGNOSTIC PRECHECK PASSED ==========\n";

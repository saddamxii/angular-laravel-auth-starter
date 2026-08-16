<?php

namespace Tests\Unit;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ApplicationBootstrapTest extends TestCase
{
    public function test_laravel_application_bootstraps_with_database_connection(): void
    {
        $this->assertTrue(app()->bound(Kernel::class));
        $this->assertTrue(app()->bound('db'));
        $this->assertNotNull(DB::connection()->getPdo());
    }
}

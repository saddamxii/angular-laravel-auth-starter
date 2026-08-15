<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('starter:about', function (): void {
    $this->info('Angular Laravel Auth Starter API');
})->purpose('Display starter information');

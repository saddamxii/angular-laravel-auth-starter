<?php

namespace App\Providers;

use App\Http\Responses\PasskeyLoginResponse;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Passkeys\Contracts\PasskeyLoginResponse as PasskeyLoginResponseContract;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(PasskeyLoginResponseContract::class, PasskeyLoginResponse::class);
    }

    public function boot(): void
    {
        RateLimiter::for('auth', function (Request $request) {
            $email = strtolower((string) $request->input('email'));
            return Limit::perMinute(5)->by($email.'|'.$request->ip());
        });

        RateLimiter::for('refresh', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });
    }
}

<?php

namespace App\Providers;

use App\Http\Responses\PasskeyLoginResponse;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
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
        $applicationUrl = rtrim((string) config('app.url'), '/');
        if (filter_var($applicationUrl, FILTER_VALIDATE_URL)) {
            URL::forceRootUrl($applicationUrl);
            URL::forceScheme((string) (parse_url($applicationUrl, PHP_URL_SCHEME) ?: 'http'));
        }

        RateLimiter::for('refresh', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        RateLimiter::for('password-change', function (Request $request) {
            return Limit::perMinute(5)->by('password-change:'.($request->user()?->id ?? $request->ip()));
        });

        RateLimiter::for('email-change', function (Request $request) {
            return Limit::perMinute(3)->by('email-change:'.($request->user()?->id ?? $request->ip()));
        });
    }
}

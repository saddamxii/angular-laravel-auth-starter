<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetRequestLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $requested = strtolower(substr((string) $request->header('Accept-Language'), 0, 2));
        $locale = in_array($requested, ['en', 'fr', 'es'], true) ? $requested : config('app.locale');
        App::setLocale($locale);

        return $next($request);
    }
}

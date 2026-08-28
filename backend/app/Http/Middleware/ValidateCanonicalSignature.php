<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class ValidateCanonicalSignature
{
    /**
     * Validate signed links against APP_URL, not an internal reverse-proxy URL.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $signature = $request->query('signature');
        $expires = $request->query('expires');

        if (! is_string($signature) || ! is_string($expires) || (int) $expires < now()->getTimestamp()) {
            abort(403, 'Invalid signature.');
        }

        $queryString = collect(explode('&', (string) $request->server('QUERY_STRING')))
            ->reject(fn (string $parameter): bool => Str::before($parameter, '=') === 'signature')
            ->implode('&');

        $canonicalUrl = rtrim((string) config('app.url'), '/')
            .$request->getBaseUrl()
            .$request->getPathInfo();
        $original = rtrim($canonicalUrl.'?'.$queryString, '?');
        $expected = hash_hmac('sha256', $original, (string) config('app.key'));

        if (! hash_equals($expected, $signature)) {
            abort(403, 'Invalid signature.');
        }

        return $next($request);
    }
}

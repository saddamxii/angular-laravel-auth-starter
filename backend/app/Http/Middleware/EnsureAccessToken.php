<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccessToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $payload = JWTAuth::parseToken()->getPayload();
        $user = $request->user('api')?->fresh();

        if (! $user || $payload->get('token_type') !== 'access') {
            return response()->json(['message' => 'An access token is required.'], 401);
        }

        if ((int) $payload->get('auth_version') !== (int) $user->auth_version) {
            return response()->json(['message' => 'This authentication session is no longer valid.'], 401);
        }

        // API routes must never fall back to an unrelated stateful web session.
        $request->setUserResolver(static fn () => $user);

        return $next($request);
    }
}

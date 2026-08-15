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

        if ($payload->get('token_type') !== 'access') {
            return response()->json(['message' => 'An access token is required.'], 401);
        }

        return $next($request);
    }
}

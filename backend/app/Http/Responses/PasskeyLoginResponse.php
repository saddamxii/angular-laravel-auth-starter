<?php

declare(strict_types=1);

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Passkeys\Contracts\PasskeyLoginResponse as PasskeyLoginResponseContract;

class PasskeyLoginResponse implements PasskeyLoginResponseContract
{
    public function toResponse($request): JsonResponse
    {
        $user = $request->user('web');

        abort_unless($user && $user->is_active && $user->hasVerifiedEmail(), 403, 'Unable to sign in with this passkey.');

        $accessToken = auth('api')
            ->claims(['token_type' => 'access'])
            ->setTTL((int) config('jwt.ttl'))
            ->login($user);

        $refreshToken = auth('api')
            ->claims(['token_type' => 'refresh'])
            ->setTTL((int) config('jwt.refresh_ttl'))
            ->login($user);

        return response()->json([
            'access_token' => $accessToken,
            'token_type' => 'Bearer',
            'expires_in' => (int) config('jwt.ttl') * 60,
            'user' => $user->load('roles.permissions'),
        ])->withCookie(cookie(
            'refresh_token',
            $refreshToken,
            (int) config('jwt.refresh_ttl'),
            '/',
            null,
            app()->isProduction(),
            true,
            false,
            'lax'
        ));
    }
}

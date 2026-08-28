<?php

namespace App\Services;

use App\Models\AuthSession;
use App\Models\User;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class AuthSessionManager
{
    public function record(User $user, string $refreshToken, Request $request): AuthSession
    {
        $tokenId = (string) JWTAuth::setToken($refreshToken)->getPayload()->get('jti');

        return AuthSession::updateOrCreate(
            ['token_id' => hash('sha256', $tokenId)],
            [
                'user_id' => $user->id,
                'device_name' => $this->deviceName($request),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'last_used_at' => now(),
                'revoked_at' => null,
            ]
        );
    }

    public function isActive(string $refreshToken, int $userId): bool
    {
        try {
            $tokenId = (string) JWTAuth::setToken($refreshToken)->getPayload()->get('jti');
            return AuthSession::query()
                ->where('user_id', $userId)
                ->where('token_id', hash('sha256', $tokenId))
                ->whereNull('revoked_at')
                ->exists();
        } catch (\Throwable) {
            return false;
        }
    }

    public function touch(string $refreshToken): void
    {
        try {
            $tokenId = (string) JWTAuth::setToken($refreshToken)->getPayload()->get('jti');
            AuthSession::where('token_id', hash('sha256', $tokenId))->update(['last_used_at' => now()]);
        } catch (\Throwable) {
            // Invalid tokens are already unusable.
        }
    }

    public function revokeByRefreshToken(string $refreshToken): void
    {
        try {
            $tokenId = (string) JWTAuth::setToken($refreshToken)->getPayload()->get('jti');
            AuthSession::where('token_id', hash('sha256', $tokenId))->update(['revoked_at' => now()]);
        } catch (\Throwable) {
            // Invalid tokens are already unusable; no persistence update is necessary.
        }
    }

    public function revokeAll(User $user): void
    {
        AuthSession::query()
            ->where('user_id', $user->id)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);
    }

    private function deviceName(Request $request): string
    {
        $userAgent = (string) $request->userAgent();
        return mb_substr($userAgent !== '' ? $userAgent : 'Unknown device', 0, 255);
    }
}

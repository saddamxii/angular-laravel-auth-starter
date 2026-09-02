<?php

namespace App\Services;

use App\Models\AuthSession;
use App\Models\User;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class AuthSessionManager
{
    /** Login/refresh/passkey success -> persists a hashed refresh JWT in auth_sessions so server-side revocation is possible. */
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

    /** Refresh endpoint -> checks that the token hash belongs to this users row and has not expired or been revoked. */
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

    /** Optional activity touch for a valid refresh token; updates auth_sessions.last_used_at without exposing the token. */
    public function touch(string $refreshToken): void
    {
        try {
            $tokenId = (string) JWTAuth::setToken($refreshToken)->getPayload()->get('jti');
            AuthSession::where('token_id', hash('sha256', $tokenId))->update(['last_used_at' => now()]);
        } catch (\Throwable) {
            // Invalid tokens are already unusable.
        }
    }

    /** Logout or one-device revoke -> sets revoked_at on the matching auth_sessions row. */
    public function revokeByRefreshToken(string $refreshToken): void
    {
        try {
            $tokenId = (string) JWTAuth::setToken($refreshToken)->getPayload()->get('jti');
            AuthSession::where('token_id', hash('sha256', $tokenId))->update(['revoked_at' => now()]);
        } catch (\Throwable) {
            // Invalid tokens are already unusable; no persistence update is necessary.
        }
    }

    /** Password/email change or Sign out all -> revokes every active auth_sessions row owned by users.id. */
    public function revokeAll(User $user): void
    {
        AuthSession::query()
            ->where('user_id', $user->id)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);
    }

    /** Derives the device label stored in auth_sessions from the request User-Agent; it is displayed on My profile. */
    private function deviceName(Request $request): string
    {
        $userAgent = (string) $request->userAgent();
        return mb_substr($userAgent !== '' ? $userAgent : 'Unknown device', 0, 255);
    }
}

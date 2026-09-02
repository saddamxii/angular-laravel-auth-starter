<?php

namespace App\Http\Controllers\Api;

use App\Models\AuthSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionController
{
    /** My profile page -> auth_sessions where user_id=current user -> active devices returned to ProfileComponent. */
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'sessions' => AuthSession::query()
                ->where('user_id', $request->user()->id)
                ->whereNull('revoked_at')
                ->latest('last_used_at')
                ->get(['id', 'device_name', 'ip_address', 'user_agent', 'last_used_at', 'created_at']),
        ]);
    }

    /** Revoke one device -> verifies auth_sessions.user_id -> records revoked_at -> ProfileComponent reloads the list. */
    public function revoke(Request $request, AuthSession $session): JsonResponse
    {
        abort_unless($session->user_id === $request->user()->id, 404);
        $session->update(['revoked_at' => now()]);

        return response()->json(['message' => 'Session revoked.']);
    }

    /** Sign out all devices -> AuthSessionManager revokes every active auth_sessions row for the current user. */
    public function revokeAll(Request $request): JsonResponse
    {
        AuthSession::where('user_id', $request->user()->id)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);

        return response()->json(['message' => 'All authentication sessions have been revoked.']);
    }
}

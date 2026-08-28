<?php

namespace App\Http\Controllers\Api;

use App\Models\AuditLog;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProfileController
{
    public function update(Request $request, AuditLogger $audit): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'username' => ['required', 'string', 'min:3', 'max:30', 'regex:/^[A-Za-z0-9_]+$/', Rule::unique('users', 'username')->ignore($user->id)],
            'preferences' => ['nullable', 'array'],
            'preferences.email_notifications' => ['nullable', 'boolean'],
        ]);

        $user->update([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'username' => Str::lower($validated['username']),
            'profile_preferences' => ['email_notifications' => (bool) data_get($validated, 'preferences.email_notifications', true)],
        ]);
        $audit->log('profile.updated', $user->id, [], $request);

        return response()->json(['user' => $this->userPayload($user->fresh())]);
    }

    public function uploadAvatar(Request $request, AuditLogger $audit): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $request->validate(['avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048']]);

        if ($user->avatar_path) Storage::disk('local')->delete($user->avatar_path);
        $path = $request->file('avatar')->storeAs('avatars/'.$user->id, Str::uuid().'.'.$request->file('avatar')->extension(), 'local');
        $user->update(['avatar_path' => $path]);
        $audit->log('profile.avatar_updated', $user->id, [], $request);

        return response()->json(['user' => $this->userPayload($user->fresh())]);
    }

    public function avatar(User $user): StreamedResponse
    {
        abort_unless($user->avatar_path && Storage::disk('local')->exists($user->avatar_path), 404);

        return Storage::disk('local')->response($user->avatar_path, null, ['Cache-Control' => 'private, max-age=3600']);
    }

    public function export(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $user->load('roles.permissions');

        return response()->json([
            'exported_at' => now()->toIso8601String(),
            'profile' => $this->userPayload($user),
            'sessions' => $user->authSessions()->get(['device_name', 'ip_address', 'user_agent', 'last_used_at', 'created_at', 'revoked_at']),
            // The passkeys table stores the public credential identifier, not an authenticator column.
            'passkeys' => $user->passkeys()->get(['id', 'name', 'credential_id', 'last_used_at', 'created_at']),
            'audit_events' => AuditLog::query()->where('user_id', $user->id)->latest('created_at')->get(['event', 'ip_address', 'metadata', 'created_at']),
        ]);
    }

    public function destroy(Request $request, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate(['current_password' => ['required', 'string'], 'confirmation' => ['required', 'in:DELETE']]);
        /** @var User $user */
        $user = $request->user();
        if (! Hash::check($validated['current_password'], $user->password)) return response()->json(['message' => 'The current password is incorrect.'], 422);

        $audit->log('profile.account_deleted', $user->id, [], $request);
        if ($user->avatar_path) Storage::disk('local')->delete($user->avatar_path);
        $user->delete();

        return response()->json(['message' => 'Your account and personal data have been deleted.']);
    }

    private function userPayload(User $user): User
    {
        $user->loadMissing('roles.permissions');
        return $user;
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Models\Role;
use App\Models\User;
use App\Services\AuthSessionManager;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class AuthController
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'], 'last_name' => ['required', 'string', 'max:100'],
            'username' => ['required', 'string', 'min:3', 'max:30', 'regex:/^[A-Za-z0-9_]+$/', 'unique:users,username'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:12', 'max:128', 'regex:/[A-Z]/', 'regex:/[a-z]/', 'regex:/[0-9]/', 'regex:/[^A-Za-z0-9]/', 'confirmed'],
            'terms_accepted' => ['required', 'accepted'],
        ]);

        $user = DB::transaction(function () use ($validated): User {
            $user = User::create([
                'first_name' => $validated['first_name'], 'last_name' => $validated['last_name'],
                'username' => Str::lower($validated['username']),
                'email' => strtolower($validated['email']), 'password' => $validated['password'],
            ]);
            $user->roles()->attach(Role::where('name', 'user')->firstOrFail());
            return $user;
        });

        $user->sendEmailVerificationNotification();
        return response()->json(['message' => 'Registration successful. Please verify your email address.'], 201);
    }

    public function login(Request $request, AuthSessionManager $sessions): JsonResponse
    {
        $credentials = $request->validate([
            'login' => ['required_without:email', 'string', 'max:255'],
            // Temporary compatibility for existing API consumers. New clients send login.
            'email' => ['nullable', 'email'],
            'password' => ['required', 'string'],
        ]);
        $identifier = Str::lower(trim((string) ($credentials['login'] ?? $credentials['email'])));
        $user = filter_var($identifier, FILTER_VALIDATE_EMAIL)
            ? User::where('email', $identifier)->first()
            : User::where('username', $identifier)->first();
        if (! $user || ! $user->is_active || ! password_verify($credentials['password'], $user->password)) {
            return response()->json(['message' => 'The provided credentials are invalid.'], 401);
        }
        if (! $user->hasVerifiedEmail()) return response()->json(['message' => 'Please verify your email address before signing in.'], 403);

        auth('web')->login($user);
        $token = auth('api')->claims(['token_type' => 'access'])->setTTL((int) config('jwt.ttl'))->login($user);
        $refreshToken = auth('api')->claims(['token_type' => 'refresh'])->setTTL((int) config('jwt.refresh_ttl'))->login($user);
        $sessions->record($user, $refreshToken, $request);
        return $this->tokenResponse($user, $token, $refreshToken);
    }

    public function refresh(Request $request, AuthSessionManager $sessions): JsonResponse
    {
        $refreshToken = $request->cookie('refresh_token');
        if (! $refreshToken) return response()->json(['message' => 'Refresh token missing.'], 401);

        try {
            $payload = JWTAuth::setToken($refreshToken)->getPayload();
            if ($payload->get('token_type') !== 'refresh') return response()->json(['message' => 'Invalid refresh token.'], 401);
            $user = User::find($payload->get('sub'));
            if (! $user || ! $user->is_active || ! $sessions->isActive($refreshToken, $user->id)) {
                return response()->json(['message' => 'Refresh session has been revoked or is invalid.'], 401);
            }

            auth('web')->login($user);
            $accessToken = auth('api')->claims(['token_type' => 'access'])->setTTL((int) config('jwt.ttl'))->login($user);
            $newRefreshToken = auth('api')->claims(['token_type' => 'refresh'])->setTTL((int) config('jwt.refresh_ttl'))->login($user);
            $sessions->revokeByRefreshToken($refreshToken);
            $sessions->record($user, $newRefreshToken, $request);
            JWTAuth::setToken($refreshToken)->invalidate(true);
            return $this->tokenResponse($user, $accessToken, $newRefreshToken, false);
        } catch (\Throwable) {
            return response()->json(['message' => 'Invalid or expired refresh token.'], 401);
        }
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate(['email' => ['required', 'email']]);
        Password::sendResetLink(['email' => strtolower($validated['email'])]);
        return response()->json(['message' => 'If the email exists, a password reset link has been sent.']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate(['token' => ['required', 'string'], 'email' => ['required', 'email'], 'password' => ['required', 'string', 'min:12', 'max:128', 'regex:/[A-Z]/', 'regex:/[a-z]/', 'regex:/[0-9]/', 'regex:/[^A-Za-z0-9]/', 'confirmed']]);
        $status = Password::reset([
            'email' => strtolower($validated['email']), 'password' => $validated['password'],
            'password_confirmation' => $request->input('password_confirmation'), 'token' => $validated['token'],
        ], function (User $user, string $password): void {
            $user->forceFill(['password' => $password])->save();
            event(new PasswordReset($user));
        });
        if ($status !== Password::PASSWORD_RESET) return response()->json(['message' => 'The password reset link is invalid or expired.'], 422);
        return response()->json(['message' => 'Password reset successfully.']);
    }

    public function passwordResetPage(string $token): mixed
    {
        $email = request()->query('email');
        abort_unless(is_string($email) && filter_var($email, FILTER_VALIDATE_EMAIL), 400);
        return redirect()->to('/reset-password?token='.urlencode($token).'&email='.urlencode($email));
    }

    public function verifyEmail(Request $request, int $id, string $hash): JsonResponse
    {
        $user = User::findOrFail($id);
        if (! hash_equals($hash, sha1($user->getEmailForVerification()))) abort(403, 'Invalid verification link.');
        if (! $user->hasVerifiedEmail() && $user->markEmailAsVerified()) event(new \Illuminate\Auth\Events\Verified($user));
        return response()->json(['message' => 'Email address verified successfully.']);
    }

    public function resendVerification(Request $request): JsonResponse
    {
        $validated = $request->validate(['email' => ['required', 'email']]);
        $user = User::where('email', strtolower($validated['email']))->first();
        if ($user && ! $user->hasVerifiedEmail() && $user->is_active) $user->sendEmailVerificationNotification();
        return response()->json(['message' => 'If the account exists and requires verification, a verification email has been sent.']);
    }

    public function logout(Request $request, AuthSessionManager $sessions): JsonResponse
    {
        $refreshToken = $request->cookie('refresh_token');
        if ($refreshToken) $sessions->revokeByRefreshToken($refreshToken);
        try { auth('api')->logout(); } catch (\Throwable) { }
        auth('web')->logout();
        return response()->json(['message' => 'Logged out successfully.'])->withCookie(cookie()->forget('refresh_token'));
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()->load('roles.permissions')]);
    }

    private function tokenResponse(User $user, string $accessToken, string $refreshToken, bool $includeUser = true): JsonResponse
    {
        return response()->json(array_filter([
            'access_token' => $accessToken, 'token_type' => 'Bearer', 'expires_in' => (int) config('jwt.ttl') * 60,
            'user' => $includeUser ? $user->load('roles.permissions') : null,
        ], static fn ($value) => $value !== null))->withCookie(cookie(
            'refresh_token', $refreshToken, (int) config('jwt.refresh_ttl'), '/', null,
            app()->isProduction(), true, false, 'lax'
        ));
    }
}

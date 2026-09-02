<?php

namespace App\Http\Controllers\Api;

use App\Models\Role;
use App\Models\User;
use App\Notifications\EmailChangeRequested;
use App\Notifications\VerifyPendingEmailChange;
use App\Services\AuditLogger;
use App\Services\AuthSessionManager;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class AuthController
{
    /** Register form -> users + role_user transaction -> email verification notification -> frontend Register confirmation. */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'], 'last_name' => ['required', 'string', 'max:100'],
            'username' => ['required', 'string', 'min:3', 'max:30', 'regex:/^[A-Za-z0-9_]+$/', 'unique:users,username'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:12', 'max:128', 'regex:/[A-Z]/', 'regex:/[a-z]/', 'regex:/[0-9]/', 'regex:/[^A-Za-z0-9]/', 'confirmed'],
            'terms_accepted' => ['required', 'accepted'],
        ]);

        $locale = in_array(App::currentLocale(), ['en', 'fr', 'es'], true) ? App::currentLocale() : 'en';
        $user = DB::transaction(function () use ($validated, $locale): User {
            $user = User::create([
                'first_name' => $validated['first_name'], 'last_name' => $validated['last_name'],
                'username' => Str::lower($validated['username']),
                'email' => strtolower($validated['email']), 'password' => $validated['password'], 'locale' => $locale,
            ]);
            $user->roles()->attach(Role::where('name', 'user')->firstOrFail());
            return $user;
        });

        $user->sendEmailVerificationNotification();
        return response()->json(['message' => 'Registration successful. Please verify your email address.'], 201);
    }

    /** Login form -> users email/username lookup -> auth_sessions row + JWT/refresh cookie -> Angular AuthService -> dashboard. */
    public function login(Request $request, AuthSessionManager $sessions): JsonResponse
    {
        $credentials = $request->validate([
            'login' => ['required_without:email', 'string', 'max:255'],
            // Temporary compatibility for existing API consumers. New clients send login.
            'email' => ['nullable', 'email'],
            'password' => ['required', 'string'],
        ]);
        $identifier = Str::lower(trim((string) ($credentials['login'] ?? $credentials['email'])));
        $throttleKey = 'password-login:'.$identifier.'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            return response()->json([
                'message' => 'Too many failed sign-in attempts. Please try again later.',
                'retry_after' => RateLimiter::availableIn($throttleKey),
            ], 429);
        }

        $user = filter_var($identifier, FILTER_VALIDATE_EMAIL)
            ? User::where('email', $identifier)->first()
            : User::where('username', $identifier)->first();
        if (! $user || ! $user->is_active || ! password_verify($credentials['password'], $user->password)) {
            RateLimiter::hit($throttleKey, 60);
            return response()->json(['message' => 'The provided credentials are invalid.'], 401);
        }
        if (! $user->hasVerifiedEmail()) return response()->json(['message' => 'Please verify your email address before signing in.'], 403);

        RateLimiter::clear($throttleKey);

        auth('web')->login($user);
        $token = auth('api')->claims(['token_type' => 'access', 'auth_version' => $user->auth_version])->setTTL((int) config('jwt.ttl'))->login($user);
        $refreshToken = auth('api')->claims(['token_type' => 'refresh', 'auth_version' => $user->auth_version])->setTTL((int) config('jwt.refresh_ttl'))->login($user);
        $sessions->record($user, $refreshToken, $request);
        return $this->tokenResponse($user, $token, $refreshToken);
    }

    /** Refresh-cookie request -> validates auth_sessions and auth_version -> rotates session/token -> Angular interceptor retries its original API call. */
    public function refresh(Request $request, AuthSessionManager $sessions): JsonResponse
    {
        $refreshToken = $request->cookie('refresh_token');
        if (! $refreshToken) return response()->json(['message' => 'Refresh token missing.'], 401);

        try {
            $payload = JWTAuth::setToken($refreshToken)->getPayload();
            if ($payload->get('token_type') !== 'refresh') return response()->json(['message' => 'Invalid refresh token.'], 401);
            $user = User::find($payload->get('sub'));
            if (! $user || ! $user->is_active || (int) $payload->get('auth_version') !== (int) $user->auth_version || ! $sessions->isActive($refreshToken, $user->id)) {
                return response()->json(['message' => 'Refresh session has been revoked or is invalid.'], 401);
            }

            auth('web')->login($user);
            $accessToken = auth('api')->claims(['token_type' => 'access', 'auth_version' => $user->auth_version])->setTTL((int) config('jwt.ttl'))->login($user);
            $newRefreshToken = auth('api')->claims(['token_type' => 'refresh', 'auth_version' => $user->auth_version])->setTTL((int) config('jwt.refresh_ttl'))->login($user);
            $sessions->revokeByRefreshToken($refreshToken);
            $sessions->record($user, $newRefreshToken, $request);
            JWTAuth::setToken($refreshToken)->invalidate(true);
            return $this->tokenResponse($user, $accessToken, $newRefreshToken, false);
        } catch (\Throwable) {
            return response()->json(['message' => 'Invalid or expired refresh token.'], 401);
        }
    }

    /** Forgot-password form -> Laravel password reset token store + LocalizedResetPassword mail -> reset-password page. */
    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate(['email' => ['required', 'email']]);
        Password::sendResetLink(['email' => strtolower($validated['email'])]);
        return response()->json(['message' => 'If the email exists, a password reset link has been sent.']);
    }

    /** Reset form -> validates broker token -> updates users.password -> user returns to login with the new credential. */
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

    /** Email link landing route -> preserves token/email and forwards the browser to Angular /reset-password. */
    public function passwordResetPage(string $token): mixed
    {
        $email = request()->query('email');
        abort_unless(is_string($email) && filter_var($email, FILTER_VALIDATE_EMAIL), 400);
        return redirect()->to('/reset-password?token='.urlencode($token).'&email='.urlencode($email));
    }

    /** Signed verification email -> marks users.email_verified_at -> redirects to frontend login?verified=1. */
    public function verifyEmail(Request $request, int $id, string $hash): mixed
    {
        $user = User::findOrFail($id);
        if (! hash_equals($hash, sha1($user->getEmailForVerification()))) abort(403, 'Invalid verification link.');
        if (! $user->hasVerifiedEmail() && $user->markEmailAsVerified()) event(new \Illuminate\Auth\Events\Verified($user));
        return redirect()->to(rtrim((string) config('app.frontend_url'), '/').'/login?verified=1');
    }

    /** Resend request -> users lookup without account enumeration -> notification if the existing user still needs verification. */
    public function resendVerification(Request $request): JsonResponse
    {
        $validated = $request->validate(['email' => ['required', 'email']]);
        $user = User::where('email', strtolower($validated['email']))->first();
        if ($user && ! $user->hasVerifiedEmail() && $user->is_active) $user->sendEmailVerificationNotification();
        return response()->json(['message' => 'If the account exists and requires verification, a verification email has been sent.']);
    }

    /** Account password form -> verifies users.password -> bumps auth_version/revokes auth_sessions -> creates one fresh session and audit_logs event. */
    public function changePassword(Request $request, AuthSessionManager $sessions, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:12', 'max:128', 'regex:/[A-Z]/', 'regex:/[a-z]/', 'regex:/[0-9]/', 'regex:/[^A-Za-z0-9]/', 'confirmed'],
        ]);

        /** @var User $user */
        $user = $request->user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            return response()->json(['message' => 'The current password is incorrect.'], 422);
        }
        if (Hash::check($validated['password'], $user->password)) {
            return response()->json(['message' => 'Choose a password different from your current password.'], 422);
        }

        DB::transaction(function () use ($user, $validated, $sessions): void {
            $user->forceFill([
                'password' => $validated['password'],
                'auth_version' => $user->auth_version + 1,
            ])->save();
            $sessions->revokeAll($user);
        });

        $user->refresh();
        auth('web')->login($user);
        $accessToken = auth('api')->claims(['token_type' => 'access', 'auth_version' => $user->auth_version])->setTTL((int) config('jwt.ttl'))->login($user);
        $refreshToken = auth('api')->claims(['token_type' => 'refresh', 'auth_version' => $user->auth_version])->setTTL((int) config('jwt.refresh_ttl'))->login($user);
        $sessions->record($user, $refreshToken, $request);
        $audit->log('auth.password_changed', $user->id, ['other_sessions_revoked' => true], $request);

        return $this->tokenResponse($user, $accessToken, $refreshToken);
    }

    /** Account email form -> stores pending_email/token on users -> notifies old and new addresses -> signed link reaches verifyPendingEmailChange. */
    public function requestEmailChange(Request $request, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
        ]);

        /** @var User $user */
        $user = $request->user();
        $newEmail = strtolower($validated['email']);

        if (! Hash::check($validated['current_password'], $user->password)) {
            return response()->json(['message' => 'The current password is incorrect.'], 422);
        }
        if ($newEmail === $user->email) {
            return response()->json(['message' => 'Choose an email address different from your current email.'], 422);
        }
        if (User::query()->where('pending_email', $newEmail)->where('id', '!=', $user->id)->exists()) {
            return response()->json(['message' => 'This email address is already awaiting verification.'], 422);
        }

        $plainToken = Str::random(64);
        $expiresAt = now()->addHour();
        $user->forceFill([
            'pending_email' => $newEmail,
            'pending_email_change_token' => hash('sha256', $plainToken),
            'pending_email_change_expires_at' => $expiresAt,
        ])->save();

        $verificationUrl = URL::temporarySignedRoute('profile.email.verify', $expiresAt, [
            'user' => $user->id,
            'token' => $plainToken,
        ]);
        $user->notify(new EmailChangeRequested($newEmail));
        $user->notify(new VerifyPendingEmailChange($newEmail, $verificationUrl));
        $audit->log('auth.email_change_requested', $user->id, ['new_email_domain' => Str::afterLast($newEmail, '@')], $request);

        return response()->json(['message' => 'Verification instructions have been sent to your new email address.']);
    }

    /** Topbar language selector -> persists users.locale -> response updates Angular currentUser and TranslationService. */
    public function updateLocale(Request $request): JsonResponse
    {
        $validated = $request->validate(['locale' => ['required', 'in:en,fr,es']]);
        /** @var User $user */
        $user = $request->user();
        $user->update(['locale' => $validated['locale']]);

        return response()->json(['user' => $user->fresh()->load('roles.permissions')]);
    }

    /** Signed new-email link -> validates pending token -> promotes pending_email to users.email, revokes sessions and redirects to login. */
    public function verifyPendingEmailChange(Request $request, User $user, string $token, AuthSessionManager $sessions, AuditLogger $audit): mixed
    {
        $tokenMatches = $user->pending_email_change_token !== null
            && hash_equals($user->pending_email_change_token, hash('sha256', $token));
        abort_unless($user->pending_email && $user->pending_email_change_expires_at?->isFuture() && $tokenMatches, 403, 'Invalid or expired email change link.');

        $newEmail = $user->pending_email;
        DB::transaction(function () use ($user, $newEmail, $sessions): void {
            $user->forceFill([
                'email' => $newEmail,
                'email_verified_at' => now(),
                'pending_email' => null,
                'pending_email_change_token' => null,
                'pending_email_change_expires_at' => null,
                'auth_version' => $user->auth_version + 1,
            ])->save();
            $sessions->revokeAll($user);
        });

        $audit->log('auth.email_changed', $user->id, ['new_email_domain' => Str::afterLast($newEmail, '@')], $request);

        return redirect()->to(rtrim((string) config('app.frontend_url'), '/').'/login?email_changed=1');
    }

    /** Sidebar/logout or expiry -> revokes refresh token's auth_sessions row, logs out guards and clears the browser refresh cookie. */
    public function logout(Request $request, AuthSessionManager $sessions): JsonResponse
    {
        $refreshToken = $request->cookie('refresh_token');
        if ($refreshToken) $sessions->revokeByRefreshToken($refreshToken);
        try { auth('api')->logout(); } catch (\Throwable) { }
        auth('web')->logout();
        return response()->json(['message' => 'Logged out successfully.'])->withCookie(cookie()->forget('refresh_token'));
    }

    /** AuthService.restoreSession -> loads the authenticated users row with roles and permissions for Angular guards/UI. */
    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()->load('roles.permissions')]);
    }

    /** Shared login/refresh response: returns short-lived JWT and puts the long-lived refresh JWT in an HttpOnly cookie. */
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

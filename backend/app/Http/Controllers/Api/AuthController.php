<?php

namespace App\Http\Controllers\Api;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class AuthController
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
            'password' => [
                'required',
                'string',
                'min:12',
                'max:128',
                'regex:/[A-Z]/',
                'regex:/[a-z]/',
                'regex:/[0-9]/',
                'regex:/[^A-Za-z0-9]/',
                'confirmed',
            ],
            'terms_accepted' => ['required', 'accepted'],
        ]);

        $user = DB::transaction(function () use ($validated): User {
            $user = User::create([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'email' => strtolower($validated['email']),
                'password' => Hash::make($validated['password']),
            ]);

            $userRole = Role::where('name', 'user')->firstOrFail();
            $user->roles()->attach($userRole);

            return $user;
        });

        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'Registration successful. Please verify your email address.',
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $credentials['email'] = strtolower($credentials['email']);
        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! $user->is_active || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json(['message' => 'The provided credentials are invalid.'], 401);
        }

        if (! $user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Please verify your email address before signing in.'], 403);
        }

        $token = auth('api')->claims(['token_type' => 'access'])->setTTL((int) config('jwt.ttl'))->login($user);
        $refreshToken = auth('api')->claims(['token_type' => 'refresh'])->setTTL((int) config('jwt.refresh_ttl'))->login($user);

        return response()->json([
            'access_token' => $token,
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

    public function refresh(Request $request): JsonResponse
    {
        $refreshToken = $request->cookie('refresh_token');

        if (! $refreshToken) {
            return response()->json(['message' => 'Refresh token missing.'], 401);
        }

        try {
            $payload = JWTAuth::setToken($refreshToken)->getPayload();

            if ($payload->get('token_type') !== 'refresh') {
                return response()->json(['message' => 'Invalid refresh token.'], 401);
            }

            $user = User::find($payload->get('sub'));

            if (! $user || ! $user->is_active) {
                return response()->json(['message' => 'Unauthorized.'], 401);
            }

            $accessToken = auth('api')->claims(['token_type' => 'access'])->setTTL((int) config('jwt.ttl'))->login($user);
            $newRefreshToken = auth('api')->claims(['token_type' => 'refresh'])->setTTL((int) config('jwt.refresh_ttl'))->login($user);

            JWTAuth::setToken($refreshToken)->invalidate(true);

            return response()->json([
                'access_token' => $accessToken,
                'token_type' => 'Bearer',
                'expires_in' => (int) config('jwt.ttl') * 60,
            ])->withCookie(cookie(
                'refresh_token',
                $newRefreshToken,
                (int) config('jwt.refresh_ttl'),
                '/',
                null,
                app()->isProduction(),
                true,
                false,
                'lax'
            ));
        } catch (\Throwable) {
            return response()->json(['message' => 'Invalid or expired refresh token.'], 401);
        }
    }

    public function logout(): JsonResponse
    {
        auth('api')->logout();

        return response()->json(['message' => 'Logged out successfully.'])
            ->withCookie(cookie()->forget('refresh_token'));
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user()->load('roles.permissions'),
        ]);
    }
}

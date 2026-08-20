<?php

use App\Http\Controllers\Api\Admin\AuditLogController;
use App\Http\Controllers\Api\Admin\RoleController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PasskeyController;
use App\Http\Controllers\Api\SessionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth.audit'])->prefix('auth')->group(function (): void {
    Route::get('csrf-cookie', fn () => response()->json(['token' => csrf_token()]));
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:5,1');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:5,1');
    Route::post('refresh', [AuthController::class, 'refresh'])->middleware('throttle:10,1');
    Route::post('password/forgot', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::post('password/reset', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');
    Route::get('password/reset/{token}', [AuthController::class, 'passwordResetPage'])->name('password.reset');
    Route::get('email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
        ->middleware('signed')
        ->name('verification.verify');
    Route::post('email/resend', [AuthController::class, 'resendVerification'])->middleware('throttle:5,1');

    Route::middleware(['auth:api', 'access.token'])->group(function (): void {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
    });
});

Route::middleware(['auth:api', 'access.token'])->group(function (): void {
    Route::get('/health/authenticated', fn () => response()->json(['status' => 'ok']));

    Route::get('sessions', [SessionController::class, 'index'])->middleware('permission:sessions.view');
    Route::delete('sessions/{session}', [SessionController::class, 'revoke'])->middleware('permission:sessions.revoke');
    Route::delete('sessions', [SessionController::class, 'revokeAll'])->middleware('permission:sessions.revoke');

    Route::get('passkeys', [PasskeyController::class, 'index'])->middleware('permission:passkeys.view');
    Route::delete('passkeys/{passkey}', [PasskeyController::class, 'destroy'])->middleware('permission:passkeys.revoke');

    Route::prefix('admin')->group(function (): void {
        Route::get('users', [UserController::class, 'index'])->middleware('permission:users.view');
        Route::post('users', [UserController::class, 'store'])->middleware('permission:users.create');
        Route::get('users/{user}', [UserController::class, 'show'])->middleware('permission:users.view');
        Route::put('users/{user}', [UserController::class, 'update'])->middleware('permission:users.update');
        Route::delete('users/{user}', [UserController::class, 'destroy'])->middleware('permission:users.delete');

        Route::get('roles', [RoleController::class, 'index'])->middleware('permission:roles.view');
        Route::put('roles/{role}', [RoleController::class, 'update'])->middleware('permission:roles.manage');

        Route::get('audit-logs', [AuditLogController::class, 'index'])->middleware('permission:audit_logs.view');
    });
});

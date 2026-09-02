<?php

use App\Http\Controllers\Api\Admin\AuditLogController;
use App\Http\Controllers\Api\Admin\PermissionController;
use App\Http\Controllers\Api\Admin\RoleController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BrandingController;
use App\Http\Controllers\Api\PasskeyController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\SessionController;
use Illuminate\Support\Facades\Route;

// Public bootstrap: Angular BrandingService reads .env/config branding values before rendering auth screens.
Route::get('branding', [BrandingController::class, 'show']);
// Avatar URLs are signed by User::getAvatarUrlAttribute; this route streams the file stored for one users row.
Route::get('profile/avatar/{user}', [ProfileController::class, 'avatar'])->middleware('canonical.signed')->name('profile.avatar');

// Guest/authentication boundary: Angular AuthService sends forms here; AuthenticationAuditMiddleware records outcomes in audit_logs.
Route::middleware(['web', 'locale', 'auth.audit'])->prefix('auth')->group(function (): void {
    Route::get('csrf-cookie', fn () => response()->json(['token' => csrf_token()]));
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:5,1');
    Route::post('login', [AuthController::class, 'login']);
    Route::post('refresh', [AuthController::class, 'refresh'])->middleware('throttle:10,1');
    Route::post('password/forgot', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::post('password/reset', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');
    Route::get('password/reset/{token}', [AuthController::class, 'passwordResetPage'])->name('password.reset');
    Route::get('email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
        ->middleware('canonical.signed')
        ->name('verification.verify');
    Route::post('email/resend', [AuthController::class, 'resendVerification'])->middleware('throttle:5,1');
    Route::get('profile/email/verify/{user}/{token}', [AuthController::class, 'verifyPendingEmailChange'])
        ->middleware('canonical.signed')
        ->name('profile.email.verify');

    // Current authenticated identity: refreshes Angular currentUser from users -> roles -> permissions.
    Route::middleware(['auth:api', 'access.token'])->group(function (): void {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
    });
});

// Protected application data. The JWT resolves the current users row; permissions are enforced here, never only in Angular.
Route::middleware(['locale', 'auth:api', 'access.token'])->group(function (): void {
    Route::get('/health/authenticated', fn () => response()->json(['status' => 'ok']));
    Route::put('profile/password', [AuthController::class, 'changePassword'])->middleware('throttle:password-change');
    Route::put('profile/email', [AuthController::class, 'requestEmailChange'])->middleware('throttle:email-change');
    Route::put('profile/locale', [AuthController::class, 'updateLocale']);
    Route::put('profile', [ProfileController::class, 'update']);
    Route::post('profile/avatar', [ProfileController::class, 'uploadAvatar'])->middleware('throttle:10,1');
    Route::get('profile/export', [ProfileController::class, 'export'])->middleware('throttle:5,1');
    Route::delete('profile', [ProfileController::class, 'destroy'])->middleware('throttle:3,1');

    Route::get('sessions', [SessionController::class, 'index'])->middleware('permission:sessions.view');
    Route::delete('sessions/{session}', [SessionController::class, 'revoke'])->middleware('permission:sessions.revoke');
    Route::delete('sessions', [SessionController::class, 'revokeAll'])->middleware('permission:sessions.revoke');

    Route::get('passkeys', [PasskeyController::class, 'index'])->middleware('permission:passkeys.view');
    Route::delete('passkeys/{passkey}', [PasskeyController::class, 'destroy'])->middleware('permission:passkeys.revoke');

    // Administration tables shown by AdminComponent. Mutations create audit_logs records through AuditLogger.
    Route::prefix('admin')->middleware('role:admin,manager')->group(function (): void {
        Route::get('users', [UserController::class, 'index'])->middleware('permission:users.view');
        Route::post('users', [UserController::class, 'store'])->middleware('permission:users.create');
        Route::get('users/{user}', [UserController::class, 'show'])->middleware('permission:users.view');
        Route::put('users/{user}', [UserController::class, 'update'])->middleware('permission:users.update');
        Route::delete('users/{user}', [UserController::class, 'destroy'])->middleware('permission:users.delete');

        Route::get('roles', [RoleController::class, 'index'])->middleware('role:admin');
        Route::post('roles', [RoleController::class, 'store'])->middleware('role:admin');
        Route::put('roles/{role}', [RoleController::class, 'update'])->middleware('role:admin');
        Route::delete('roles/{role}', [RoleController::class, 'destroy'])->middleware('role:admin');
        Route::post('permissions', [PermissionController::class, 'store'])->middleware('role:admin');

        Route::get('audit-logs/options', [AuditLogController::class, 'options'])->middleware(['role:admin', 'permission:audit_logs.view']);
        Route::get('audit-logs', [AuditLogController::class, 'index'])->middleware(['role:admin', 'permission:audit_logs.view']);
    });
});

<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

Route::middleware('web')->prefix('auth')->group(function (): void {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:auth');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:auth');
    Route::post('refresh', [AuthController::class, 'refresh'])->middleware('throttle:refresh');
    Route::post('password/forgot', [AuthController::class, 'forgotPassword'])->middleware('throttle:auth');
    Route::post('password/reset', [AuthController::class, 'resetPassword'])->middleware('throttle:auth');
    Route::get('password/reset/{token}', [AuthController::class, 'passwordResetPage'])->name('password.reset');
    Route::get('email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
        ->middleware('signed')
        ->name('verification.verify');
    Route::post('email/resend', [AuthController::class, 'resendVerification'])->middleware('throttle:auth');

    Route::middleware(['auth:api', 'access.token'])->group(function (): void {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
    });
});

Route::middleware(['auth:api', 'access.token'])->get('/health/authenticated', fn () => response()->json([
    'status' => 'ok',
]));

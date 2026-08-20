<?php

namespace App\Http\Middleware;

use App\Services\AuditLogger;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticationAuditMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $audit = app(AuditLogger::class);
        $response = $next($request);
        $event = $this->eventFor($request, $response);

        if ($event !== null) {
            $audit->log(
                $event,
                $request->user('api')?->id ?? $request->user('web')?->id,
                [
                    'status' => $response->getStatusCode(),
                    'email' => $request->input('email'),
                ],
                $request,
            );
        }

        return $response;
    }

    private function eventFor(Request $request, Response $response): ?string
    {
        return match (true) {
            $request->is('api/auth/register') && $response->isSuccessful() => 'auth.registration_success',
            $request->is('api/auth/login') && $response->isSuccessful() => 'auth.login_success',
            $request->is('api/auth/login') && $response->getStatusCode() === 401 => 'auth.login_failed',
            $request->is('api/auth/logout') && $response->isSuccessful() => 'auth.logout',
            $request->is('api/auth/password/forgot') => 'auth.password_reset_requested',
            $request->is('api/auth/password/reset') && $response->isSuccessful() => 'auth.password_reset_success',
            $request->is('api/auth/email/resend') => 'auth.verification_email_requested',
            default => null,
        };
    }
}

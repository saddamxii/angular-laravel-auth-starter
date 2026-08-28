<?php

namespace Tests\Feature\Auth;

use App\Models\AuthSession;
use App\Models\Role;
use App\Models\User;
use App\Notifications\EmailChangeRequested;
use App\Notifications\VerifyPendingEmailChange;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ChangeEmailTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function user(): User
    {
        $user = User::create([
            'first_name' => 'Email',
            'last_name' => 'Tester',
            'email' => 'email@example.test',
            'password' => Hash::make('CurrentPassword!123'),
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $user->roles()->attach(Role::where('name', 'user')->firstOrFail());

        return $user;
    }

    public function test_email_change_requires_verification_and_invalidates_existing_sessions_when_verified(): void
    {
        Notification::fake();
        $user = $this->user();
        $login = $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'CurrentPassword!123'])->assertOk();

        $this->withHeader('Authorization', 'Bearer '.$login->json('access_token'))
            ->putJson('/api/profile/email', [
                'current_password' => 'CurrentPassword!123',
                'email' => 'new-email@example.test',
            ])
            ->assertOk();

        $user->refresh();
        $this->assertSame('email@example.test', $user->email);
        $this->assertSame('new-email@example.test', $user->pending_email);
        $this->assertNotNull($user->pending_email_change_token);
        Notification::assertSentTo($user, EmailChangeRequested::class);

        $verificationUrl = '';
        Notification::assertSentTo($user, VerifyPendingEmailChange::class, function (VerifyPendingEmailChange $notification) use (&$verificationUrl): bool {
            $verificationUrl = $notification->verificationUrl;
            return true;
        });

        $parts = parse_url($verificationUrl);
        $this->get(($parts['path'] ?? '').(isset($parts['query']) ? '?'.$parts['query'] : ''))
            ->assertRedirect(config('app.frontend_url').'/login?email_changed=1');

        $user->refresh();
        $this->assertSame('new-email@example.test', $user->email);
        $this->assertNull($user->pending_email);
        $this->assertNotNull($user->email_verified_at);
        $this->assertSame(2, $user->auth_version);
        $this->assertSame(0, AuthSession::where('user_id', $user->id)->whereNull('revoked_at')->count());

        $this->withHeader('Authorization', 'Bearer '.$login->json('access_token'))
            ->getJson('/api/health/authenticated')
            ->assertUnauthorized();
    }

    public function test_email_change_requires_the_current_password(): void
    {
        Notification::fake();
        $user = $this->user();
        $login = $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'CurrentPassword!123'])->assertOk();

        $this->withHeader('Authorization', 'Bearer '.$login->json('access_token'))
            ->putJson('/api/profile/email', [
                'current_password' => 'WrongPassword!123',
                'email' => 'new-email@example.test',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'The current password is incorrect.');

        $user->refresh();
        $this->assertNull($user->pending_email);
        Notification::assertNothingSent();
    }
}

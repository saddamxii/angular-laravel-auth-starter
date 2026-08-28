<?php

namespace Tests\Feature\Auth;

use App\Models\AuthSession;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class ChangePasswordTest extends TestCase
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
            'first_name' => 'Password',
            'last_name' => 'Tester',
            'email' => 'password@example.test',
            'password' => Hash::make('CurrentPassword!123'),
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $user->roles()->attach(Role::where('name', 'user')->firstOrFail());

        return $user;
    }

    private function refreshTokenFrom(TestResponse $response): string
    {
        foreach ($response->headers->getCookies() as $cookie) {
            if ($cookie->getName() === 'refresh_token') {
                return $cookie->getValue();
            }
        }

        $this->fail('The response did not set a refresh_token cookie.');
    }

    public function test_password_change_revokes_existing_sessions_and_issues_a_fresh_current_session(): void
    {
        $user = $this->user();
        $currentLogin = $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'CurrentPassword!123'])->assertOk();
        $otherLogin = $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'CurrentPassword!123'])->assertOk();
        $otherRefreshToken = $this->refreshTokenFrom($otherLogin);

        $change = $this->withHeader('Authorization', 'Bearer '.$currentLogin->json('access_token'))
            ->putJson('/api/profile/password', [
                'current_password' => 'CurrentPassword!123',
                'password' => 'NewPassword!456',
                'password_confirmation' => 'NewPassword!456',
            ])
            ->assertOk()
            ->assertJsonStructure(['access_token', 'token_type', 'expires_in', 'user']);

        $user->refresh();
        $this->assertTrue(Hash::check('NewPassword!456', $user->password));
        $this->assertSame(2, $user->auth_version);
        $this->assertSame(1, AuthSession::where('user_id', $user->id)->whereNull('revoked_at')->count());
        $this->assertSame(2, AuthSession::where('user_id', $user->id)->whereNotNull('revoked_at')->count());

        $this->withHeader('Authorization', 'Bearer '.$otherLogin->json('access_token'))
            ->getJson('/api/health/authenticated')
            ->assertUnauthorized();

        $this->withCredentials()
            ->withUnencryptedCookie('refresh_token', $otherRefreshToken)
            ->postJson('/api/auth/refresh')
            ->assertUnauthorized();

        $this->withHeader('Authorization', 'Bearer '.$change->json('access_token'))
            ->getJson('/api/health/authenticated')
            ->assertOk();
    }

    public function test_password_change_requires_the_correct_current_password(): void
    {
        $user = $this->user();
        $login = $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'CurrentPassword!123'])->assertOk();

        $this->withHeader('Authorization', 'Bearer '.$login->json('access_token'))
            ->putJson('/api/profile/password', [
                'current_password' => 'NotTheCurrentPassword!123',
                'password' => 'NewPassword!456',
                'password_confirmation' => 'NewPassword!456',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'The current password is incorrect.');

        $user->refresh();
        $this->assertTrue(Hash::check('CurrentPassword!123', $user->password));
        $this->assertSame(1, $user->auth_version);
    }
}

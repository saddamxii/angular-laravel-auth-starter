<?php

namespace Tests\Feature\Auth;

use App\Models\AuthSession;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class RefreshSessionTest extends TestCase
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
            'first_name' => 'Refresh', 'last_name' => 'Tester', 'email' => 'refresh@example.test',
            'password' => Hash::make('StrongPassword!123'),
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

    public function test_refresh_rotates_the_refresh_token_and_creates_a_new_session(): void
    {
        $user = $this->user();
        $login = $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'StrongPassword!123'])->assertOk();
        $cookie = $this->refreshTokenFrom($login);
        $this->assertSame(1, AuthSession::where('user_id', $user->id)->whereNull('revoked_at')->count());

        $refresh = $this->withCredentials()
            ->withUnencryptedCookie('refresh_token', $cookie)
            ->postJson('/api/auth/refresh');
        $this->assertSame(200, $refresh->getStatusCode(), $refresh->getContent());
        $refresh->assertJsonStructure(['access_token', 'token_type', 'expires_in']);
        $this->assertSame(1, AuthSession::where('user_id', $user->id)->whereNull('revoked_at')->count());
        $this->assertSame(1, AuthSession::where('user_id', $user->id)->whereNotNull('revoked_at')->count());
        $newCookie = $this->refreshTokenFrom($refresh);
        $this->assertNotSame($cookie, $newCookie);
        $this->withCredentials()
            ->withUnencryptedCookie('refresh_token', $cookie)
            ->postJson('/api/auth/refresh')
            ->assertStatus(401);
    }

    public function test_revoked_session_cannot_refresh(): void
    {
        $user = $this->user();
        $login = $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'StrongPassword!123'])->assertOk();
        $cookie = $this->refreshTokenFrom($login);
        AuthSession::where('user_id', $user->id)->firstOrFail()->update(['revoked_at' => now()]);
        $this->withCredentials()
            ->withUnencryptedCookie('refresh_token', $cookie)
            ->postJson('/api/auth/refresh')
            ->assertStatus(401);
    }
}

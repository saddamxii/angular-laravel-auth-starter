<?php

namespace Tests\Feature\Auth;

use App\Models\AuthSession;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
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
            'password' => Hash::make('StrongPassword!123'), 'email_verified_at' => now(),
        ]);
        $user->roles()->attach(Role::where('name', 'user')->firstOrFail());
        return $user;
    }

    public function test_refresh_rotates_the_refresh_token_and_creates_a_new_session(): void
    {
        $user = $this->user();
        $login = $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'StrongPassword!123'])->assertOk();
        $cookie = $login->headers->getCookies()[0]->getValue();
        $this->assertSame(1, AuthSession::where('user_id', $user->id)->whereNull('revoked_at')->count());

        $refresh = $this->withCookie('refresh_token', $cookie)->postJson('/api/auth/refresh');
        $refresh->assertOk()->assertJsonStructure(['access_token', 'token_type', 'expires_in']);
        $this->assertSame(1, AuthSession::where('user_id', $user->id)->whereNull('revoked_at')->count());
        $this->assertSame(1, AuthSession::where('user_id', $user->id)->whereNotNull('revoked_at')->count());
        $newCookie = $refresh->headers->getCookies()[0]->getValue();
        $this->assertNotSame($cookie, $newCookie);
        $this->withCookie('refresh_token', $cookie)->postJson('/api/auth/refresh')->assertStatus(401);
    }

    public function test_revoked_session_cannot_refresh(): void
    {
        $user = $this->user();
        $login = $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'StrongPassword!123'])->assertOk();
        $cookie = $login->headers->getCookies()[0]->getValue();
        AuthSession::where('user_id', $user->id)->firstOrFail()->update(['revoked_at' => now()]);
        $this->withCookie('refresh_token', $cookie)->postJson('/api/auth/refresh')->assertStatus(401);
    }
}

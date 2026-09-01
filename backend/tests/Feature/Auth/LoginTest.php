<?php

namespace Tests\Feature\Auth;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_unverified_user_cannot_login(): void
    {
        $user = User::create([
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => 'jane@example.test',
            'password' => Hash::make('StrongPassword!123'),
        ]);
        $user->roles()->attach(Role::where('name', 'user')->first());

        $response = $this->postJson('/api/auth/login', [
            'email' => 'jane@example.test',
            'password' => 'StrongPassword!123',
        ]);

        $response->assertStatus(403);
    }

    public function test_verified_user_receives_access_token_and_refresh_cookie(): void
    {
        $user = User::create([
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => 'jane@example.test',
            'password' => Hash::make('StrongPassword!123'),
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $user->roles()->attach(Role::where('name', 'user')->first());

        $response = $this->postJson('/api/auth/login', [
            'email' => 'jane@example.test',
            'password' => 'StrongPassword!123',
        ]);

        $response->assertOk()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonStructure(['access_token', 'expires_in', 'user']);
        $this->assertNotEmpty($response->headers->getCookies());
    }

    public function test_verified_user_can_login_with_username(): void
    {
        $user = User::create([
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'username' => 'jane_doe',
            'email' => 'jane@example.test',
            'password' => Hash::make('StrongPassword!123'),
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $user->roles()->attach(Role::where('name', 'user')->first());

        $this->postJson('/api/auth/login', [
            'login' => 'JANE_DOE',
            'password' => 'StrongPassword!123',
        ])->assertOk()->assertJsonPath('user.username', 'jane_doe');
    }

    public function test_successful_password_logins_do_not_trigger_the_failed_login_limiter(): void
    {
        $user = User::create([
            'first_name' => 'Rate',
            'last_name' => 'Limit',
            'email' => 'rate-limit@example.test',
            'password' => Hash::make('StrongPassword!123'),
            'is_active' => true,
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $user->roles()->attach(Role::where('name', 'user')->first());

        foreach (range(1, 6) as $_) {
            $this->postJson('/api/auth/login', [
                'email' => $user->email,
                'password' => 'StrongPassword!123',
            ])->assertOk();
        }
    }

    public function test_failed_password_attempts_are_limited_per_account_and_ip(): void
    {
        foreach (range(1, 5) as $_) {
            $this->postJson('/api/auth/login', [
                'email' => 'target@example.test',
                'password' => 'IncorrectPassword!123',
            ])->assertUnauthorized();
        }

        $this->postJson('/api/auth/login', [
            'email' => 'target@example.test',
            'password' => 'IncorrectPassword!123',
        ])->assertTooManyRequests();

        $this->postJson('/api/auth/login', [
            'email' => 'another-account@example.test',
            'password' => 'IncorrectPassword!123',
        ])->assertUnauthorized();
    }
}

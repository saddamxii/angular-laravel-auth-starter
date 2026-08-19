<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_verified_user_can_login_and_receive_a_real_jwt(): void
    {
        $user = User::create([
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'verified@example.test',
            'password' => Hash::make('StrongPass!123456'),
            'is_active' => true,
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $user->roles()->attach(Role::where('name', 'user')->firstOrFail());

        $response = $this->withoutMiddleware(VerifyCsrfToken::class)->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'StrongPass!123456',
        ]);

        $response->assertOk()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonStructure(['access_token', 'expires_in', 'user']);

        $this->assertNotEmpty($response->json('access_token'));
        $this->assertNotEmpty($response->headers->getCookies());
    }

    public function test_unverified_user_cannot_login(): void
    {
        $user = User::create([
            'first_name' => 'Unverified',
            'last_name' => 'User',
            'email' => 'unverified@example.test',
            'password' => Hash::make('StrongPass!123456'),
            'is_active' => true,
        ]);
        $user->roles()->attach(Role::where('name', 'user')->firstOrFail());

        $this->withoutMiddleware(VerifyCsrfToken::class)
            ->postJson('/api/auth/login', [
                'email' => $user->email,
                'password' => 'StrongPass!123456',
            ])
            ->assertForbidden()
            ->assertJsonPath('message', 'Please verify your email address before signing in.');
    }

    public function test_inactive_user_cannot_login(): void
    {
        $user = User::create([
            'first_name' => 'Inactive',
            'last_name' => 'User',
            'email' => 'inactive@example.test',
            'password' => Hash::make('StrongPass!123456'),
            'is_active' => false,
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $user->roles()->attach(Role::where('name', 'user')->firstOrFail());

        $this->withoutMiddleware(VerifyCsrfToken::class)
            ->postJson('/api/auth/login', [
                'email' => $user->email,
                'password' => 'StrongPass!123456',
            ])
            ->assertUnauthorized();
    }

    public function test_user_can_access_authenticated_health_endpoint_with_real_access_token(): void
    {
        $user = User::create([
            'first_name' => 'API',
            'last_name' => 'User',
            'email' => 'api-user@example.test',
            'password' => Hash::make('StrongPass!123456'),
            'is_active' => true,
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $user->roles()->attach(Role::where('name', 'user')->firstOrFail());

        $login = $this->withoutMiddleware(VerifyCsrfToken::class)->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'StrongPass!123456',
        ]);
        $token = $login->json('access_token');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/health/authenticated')
            ->assertOk()
            ->assertJson(['status' => 'ok']);
    }

    public function test_user_role_is_denied_from_admin_user_list(): void
    {
        $user = User::create([
            'first_name' => 'Regular',
            'last_name' => 'User',
            'email' => 'regular@example.test',
            'password' => Hash::make('StrongPass!123456'),
            'is_active' => true,
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $user->roles()->attach(Role::where('name', 'user')->firstOrFail());

        $login = $this->withoutMiddleware(VerifyCsrfToken::class)->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'StrongPass!123456',
        ]);
        $token = $login->json('access_token');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/users')
            ->assertForbidden();
    }

    public function test_admin_role_can_access_admin_user_list(): void
    {
        $admin = User::create([
            'first_name' => 'Test',
            'last_name' => 'Admin',
            'email' => 'test-admin@example.test',
            'password' => Hash::make('StrongPass!123456'),
            'is_active' => true,
        ]);
        $admin->forceFill(['email_verified_at' => now()])->save();
        $admin->roles()->attach(Role::where('name', 'admin')->firstOrFail());

        $login = $this->withoutMiddleware(VerifyCsrfToken::class)->postJson('/api/auth/login', [
            'email' => $admin->email,
            'password' => 'StrongPass!123456',
        ]);
        $token = $login->json('access_token');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/users')
            ->assertOk();
    }
}

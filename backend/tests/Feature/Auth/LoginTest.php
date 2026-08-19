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
}

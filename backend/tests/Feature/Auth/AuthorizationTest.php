<?php

namespace Tests\Feature\Auth;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_regular_user_cannot_read_admin_user_endpoint(): void
    {
        $user = User::create([
            'first_name' => 'Regular',
            'last_name' => 'User',
            'email' => 'authorization-regular@example.test',
            'password' => Hash::make('StrongPassword!123'),
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $user->roles()->attach(Role::where('name', 'user')->first());

        $token = $this->withoutMiddleware(VerifyCsrfToken::class)
            ->postJson('/api/auth/login', [
                'email' => $user->email,
                'password' => 'StrongPassword!123',
            ])
            ->assertOk()
            ->json('access_token');

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/users');

        $response->assertForbidden();
    }
}

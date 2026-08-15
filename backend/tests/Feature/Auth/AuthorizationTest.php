<?php

namespace Tests\Feature\Auth;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
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
            'email' => 'user@example.test',
            'password' => Hash::make('StrongPassword!123'),
            'email_verified_at' => now(),
        ]);
        $user->roles()->attach(Role::where('name', 'user')->first());

        $token = JWTAuth::claims(['token_type' => 'access'])->setTTL(15)->login($user);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/users');

        $response->assertForbidden();
    }
}

<?php

namespace Tests\Feature\Auth;

use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_registration_requires_terms_acceptance(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'username' => 'janedoe',
            'email' => 'jane@example.test',
            'password' => 'StrongPassword!123',
            'password_confirmation' => 'StrongPassword!123',
            'terms_accepted' => false,
        ]);

        $response->assertStatus(422);
    }

    public function test_registration_creates_user_with_default_user_role(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'username' => 'janedoe',
            'email' => 'jane@example.test',
            'password' => 'StrongPassword!123',
            'password_confirmation' => 'StrongPassword!123',
            'terms_accepted' => true,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('users', ['email' => 'jane@example.test', 'username' => 'janedoe']);
        $this->assertDatabaseHas('roles', ['name' => 'user']);
        $this->assertDatabaseHas('role_user', [
            'user_id' => \App\Models\User::where('email', 'jane@example.test')->value('id'),
            'role_id' => Role::where('name', 'user')->value('id'),
        ]);
    }
}

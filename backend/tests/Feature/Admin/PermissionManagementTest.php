<?php

namespace Tests\Feature\Admin;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PermissionManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_admin_can_create_a_reusable_permission(): void
    {
        $admin = User::create([
            'first_name' => 'Test',
            'last_name' => 'Admin',
            'email' => 'permission-admin@example.test',
            'password' => Hash::make('StrongPass!123456'),
            'is_active' => true,
        ]);
        $admin->forceFill(['email_verified_at' => now()])->save();
        $admin->roles()->attach(Role::where('name', 'admin')->firstOrFail());

        $token = $this->withoutMiddleware(VerifyCsrfToken::class)
            ->postJson('/api/auth/login', ['email' => $admin->email, 'password' => 'StrongPass!123456'])
            ->json('access_token');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/admin/permissions', ['name' => 'projects.create', 'display_name' => 'Create projects'])
            ->assertCreated()
            ->assertJsonPath('permission.name', 'projects.create');

        $this->assertDatabaseHas(Permission::class, ['name' => 'projects.create', 'display_name' => 'Create projects']);
    }
}

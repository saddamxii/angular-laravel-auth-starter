<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'dashboard.view',
            'users.view',
            'users.create',
            'users.update',
            'users.delete',
            'roles.view',
            'roles.manage',
            'sessions.view',
            'sessions.revoke',
            'passkeys.view',
            'passkeys.revoke',
            'audit_logs.view',
        ];

        $permissionModels = collect($permissions)->mapWithKeys(fn (string $name) => [
            $name => Permission::firstOrCreate([
                'name' => $name,
            ], [
                'display_name' => str($name)->replace('.', ' ')->title()->toString(),
            ]),
        ]);

        $rolePermissions = [
            'admin' => $permissions,
            'manager' => ['dashboard.view', 'users.view', 'users.create', 'users.update', 'sessions.view', 'sessions.revoke'],
            'editor' => ['dashboard.view', 'users.view'],
            'user' => ['dashboard.view', 'sessions.view', 'sessions.revoke', 'passkeys.view', 'passkeys.revoke'],
        ];

        foreach ($rolePermissions as $roleName => $rolePermissionNames) {
            $role = Role::updateOrCreate(
                ['name' => $roleName],
                ['display_name' => str($roleName)->title()->toString()]
            );

            $role->permissions()->sync(
                collect($rolePermissionNames)->map(fn ($permission) => $permissionModels[$permission]->id)->all()
            );
        }

        if (app()->environment(['local', 'testing'])) {
            $admin = User::firstOrCreate(
                ['email' => 'admin@example.test'],
                [
                    'first_name' => 'System',
                    'last_name' => 'Administrator',
                    'username' => 'admin',
                    'password' => Hash::make('ChangeMe!123456'),
                    'is_active' => true,
                ]
            );
            $admin->forceFill(['username' => $admin->username ?? 'admin', 'email_verified_at' => now()])->save();

            $admin->roles()->syncWithoutDetaching([
                Role::where('name', 'admin')->value('id'),
            ]);
        }
    }
}

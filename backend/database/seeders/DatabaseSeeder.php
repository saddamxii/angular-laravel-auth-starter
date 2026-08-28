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
            $demoUsers = [
                ['role' => 'admin', 'first_name' => 'Admin', 'last_name' => 'User', 'email' => 'admin@example.test', 'username' => 'admin', 'password' => 'Admin@admin.11'],
                ['role' => 'manager', 'first_name' => 'Manager', 'last_name' => 'User', 'email' => 'manager@example.test', 'username' => 'manager', 'password' => 'Manager@manager.11'],
                ['role' => 'editor', 'first_name' => 'Editor', 'last_name' => 'User', 'email' => 'editor@example.test', 'username' => 'editor', 'password' => 'Editor@editor.11'],
                ['role' => 'user', 'first_name' => 'User', 'last_name' => 'User', 'email' => 'user@example.test', 'username' => 'user', 'password' => 'User@user.11'],
            ];

            foreach ($demoUsers as $demoUser) {
                $user = User::firstOrCreate(
                    ['email' => $demoUser['email']],
                    [
                        'first_name' => $demoUser['first_name'],
                        'last_name' => $demoUser['last_name'],
                        'username' => $demoUser['username'],
                        'password' => Hash::make($demoUser['password']),
                        'is_active' => true,
                    ]
                );

                $user->forceFill([
                    'username' => $user->username ?? $demoUser['username'],
                    'password' => Hash::make($demoUser['password']),
                    'is_active' => true,
                    'email_verified_at' => now(),
                ])->save();
                $user->roles()->syncWithoutDetaching([
                    Role::where('name', $demoUser['role'])->value('id'),
                ]);
            }
        }
    }
}

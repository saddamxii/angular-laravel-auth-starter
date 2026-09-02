<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Role;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController
{
    /** Admin Users table -> paginates users with roles/permissions; query filters feed AdminComponent search and table state. */
    public function index(Request $request): JsonResponse
    {
        $users = User::query()
            ->with('roles.permissions')
            ->when($request->string('search')->value(), function ($query, string $search): void {
                $query->where(fn ($q) => $q
                    ->where('email', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%"));
            })
            ->latest()
            ->paginate(min($request->integer('per_page', 20), 100));

        return response()->json($users);
    }

    /** Add user dialog -> inserts users + role_user -> audit_logs -> AdminComponent reloads its users table. */
    public function store(Request $request, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'username' => ['required', 'string', 'min:3', 'max:30', 'regex:/^[A-Za-z0-9_]+$/', 'unique:users,username'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:12', 'confirmed'],
            'role' => ['required', 'string', Rule::exists('roles', 'name')],
        ]);

        abort_if(! $request->user()->hasRole('admin') && $validated['role'] !== 'user', 403, 'Managers can only create standard users.');

        $user = User::create([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'username' => strtolower($validated['username']),
            'email' => strtolower($validated['email']),
            'password' => Hash::make($validated['password']),
            'email_verified_at' => now(),
        ]);

        $user->roles()->sync([Role::where('name', $validated['role'])->value('id')]);
        $audit->log('admin.user_created', $request->user()->id, ['target_user_id' => $user->id]);

        return response()->json(['user' => $user->load('roles.permissions')], 201);
    }

    /** Admin user detail request -> returns one users row with roles/permissions after route/middleware authorization. */
    public function show(User $user): JsonResponse
    {
        return response()->json(['user' => $user->load('roles.permissions')]);
    }

    /** Edit user dialog -> updates users and role_user assignments -> audit_logs -> refreshed admin table. */
    public function update(Request $request, User $user, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['sometimes', 'string', 'max:100'],
            'last_name' => ['sometimes', 'string', 'max:100'],
            'username' => ['sometimes', 'string', 'min:3', 'max:30', 'regex:/^[A-Za-z0-9_]+$/', Rule::unique('users')->ignore($user->id)],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'is_active' => ['sometimes', 'boolean'],
            'role' => ['sometimes', 'string', Rule::exists('roles', 'name')],
        ]);

        $role = $validated['role'] ?? null;
        unset($validated['role']);

        abort_if(
            ! $request->user()->hasRole('admin') && ($user->hasRole('admin') || $role !== null),
            403,
            'Managers cannot modify administrator accounts or roles.'
        );

        abort_if(
            $user->is($request->user()) && ($role !== null || array_key_exists('is_active', $validated)),
            422,
            'You cannot change your own role or account status.'
        );
        if (isset($validated['email'])) {
            $validated['email'] = strtolower($validated['email']);
        }
        if (isset($validated['username'])) {
            $validated['username'] = strtolower($validated['username']);
        }

        $user->update($validated);
        if ($role !== null) {
            $user->roles()->sync([Role::where('name', $role)->value('id')]);
        }

        $audit->log('admin.user_updated', $request->user()->id, ['target_user_id' => $user->id]);

        return response()->json(['user' => $user->fresh()->load('roles.permissions')]);
    }

    /** Delete user action -> prevents unsafe deletion rules, removes users row/relations and writes an audit_logs event. */
    public function destroy(Request $request, User $user, AuditLogger $audit): JsonResponse
    {
        abort_if($user->id === $request->user()->id, 422, 'You cannot delete your own account.');

        $targetId = $user->id;
        $user->delete();
        $audit->log('admin.user_deleted', $request->user()->id, ['target_user_id' => $targetId]);

        return response()->json(['message' => 'User deleted.']);
    }
}

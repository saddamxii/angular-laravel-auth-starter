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
    public function index(Request $request): JsonResponse
    {
        $users = User::query()
            ->with('roles.permissions')
            ->when($request->string('search')->value(), function ($query, string $search): void {
                $query->where(fn ($q) => $q
                    ->where('email', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%"));
            })
            ->latest()
            ->paginate(min($request->integer('per_page', 20), 100));

        return response()->json($users);
    }

    public function store(Request $request, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:12', 'confirmed'],
            'role' => ['required', Rule::in(['admin', 'manager', 'editor', 'user'])],
        ]);

        $user = User::create([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'email' => strtolower($validated['email']),
            'password' => Hash::make($validated['password']),
            'email_verified_at' => now(),
        ]);

        $user->roles()->sync([Role::where('name', $validated['role'])->value('id')]);
        $audit->log('admin.user_created', $request->user()->id, ['target_user_id' => $user->id]);

        return response()->json(['user' => $user->load('roles.permissions')], 201);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json(['user' => $user->load('roles.permissions')]);
    }

    public function update(Request $request, User $user, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['sometimes', 'string', 'max:100'],
            'last_name' => ['sometimes', 'string', 'max:100'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'is_active' => ['sometimes', 'boolean'],
            'role' => ['sometimes', Rule::in(['admin', 'manager', 'editor', 'user'])],
        ]);

        $role = $validated['role'] ?? null;
        unset($validated['role']);
        if (isset($validated['email'])) {
            $validated['email'] = strtolower($validated['email']);
        }

        $user->update($validated);
        if ($role !== null) {
            $user->roles()->sync([Role::where('name', $role)->value('id')]);
        }

        $audit->log('admin.user_updated', $request->user()->id, ['target_user_id' => $user->id]);

        return response()->json(['user' => $user->fresh()->load('roles.permissions')]);
    }

    public function destroy(Request $request, User $user, AuditLogger $audit): JsonResponse
    {
        abort_if($user->id === $request->user()->id, 422, 'You cannot delete your own account.');

        $targetId = $user->id;
        $user->delete();
        $audit->log('admin.user_deleted', $request->user()->id, ['target_user_id' => $targetId]);

        return response()->json(['message' => 'User deleted.']);
    }
}

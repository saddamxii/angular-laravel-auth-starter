<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Permission;
use App\Models\Role;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleController
{
    public function index(): JsonResponse
    {
        return response()->json([
            'roles' => Role::with('permissions')->orderBy('name')->get(),
            'permissions' => Permission::orderBy('name')->get(),
        ]);
    }

    public function update(Request $request, Role $role, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate([
            'display_name' => ['sometimes', 'string', 'max:100'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['integer', 'exists:permissions,id'],
        ]);

        if (isset($validated['display_name'])) {
            $role->update(['display_name' => $validated['display_name']]);
        }
        if (isset($validated['permissions'])) {
            $role->permissions()->sync($validated['permissions']);
        }

        $audit->log('admin.role_updated', $request->user()->id, ['role_id' => $role->id]);

        return response()->json(['role' => $role->fresh()->load('permissions')]);
    }
}

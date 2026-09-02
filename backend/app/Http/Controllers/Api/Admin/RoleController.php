<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Permission;
use App\Models\Role;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoleController
{
    /** Roles/permissions administration page -> reads roles with permissions for the AdminComponent tables and dialogs. */
    public function index(): JsonResponse
    {
        return response()->json([
            'roles' => Role::with('permissions')->orderBy('name')->get(),
            'permissions' => Permission::orderBy('name')->get(),
        ]);
    }

    /** Add role dialog -> inserts roles, syncs permission_role pivot rows and logs the operation. */
    public function store(Request $request, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:3', 'max:50', 'regex:/^[a-z][a-z0-9_]*$/', 'unique:roles,name'],
            'display_name' => ['required', 'string', 'max:100'],
            'permissions' => ['present', 'array'],
            'permissions.*' => ['integer', 'exists:permissions,id'],
        ]);

        $role = Role::create([
            'name' => strtolower($validated['name']),
            'display_name' => $validated['display_name'],
        ]);
        $role->permissions()->sync($validated['permissions']);
        $audit->log('admin.role_created', $request->user()->id, ['role_id' => $role->id]);

        return response()->json(['role' => $role->fresh()->load('permissions')], 201);
    }

    /** Edit role dialog -> changes roles fields/permission_role links, then emits an audit_logs record. */
    public function update(Request $request, Role $role, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'min:3', 'max:50', 'regex:/^[a-z][a-z0-9_]*$/', Rule::unique('roles', 'name')->ignore($role->id)],
            'display_name' => ['sometimes', 'string', 'max:100'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['integer', 'exists:permissions,id'],
        ]);

        abort_if($role->name === 'admin' && isset($validated['name']) && $validated['name'] !== 'admin', 422, 'The administrator role cannot be renamed.');

        if (isset($validated['display_name']) || isset($validated['name'])) {
            $role->update(array_filter([
                'name' => isset($validated['name']) ? strtolower($validated['name']) : null,
                'display_name' => $validated['display_name'] ?? null,
            ], static fn ($value) => $value !== null));
        }
        if (isset($validated['permissions'])) {
            $role->permissions()->sync($validated['permissions']);
        }

        $audit->log('admin.role_updated', $request->user()->id, ['role_id' => $role->id]);

        return response()->json(['role' => $role->fresh()->load('permissions')]);
    }

    /** Delete role action -> removes a non-protected role and related pivots, preserving an audit trail. */
    public function destroy(Request $request, Role $role, AuditLogger $audit): JsonResponse
    {
        abort_if($role->name === 'admin', 422, 'The administrator role cannot be deleted.');
        abort_if($role->users()->exists(), 422, 'Assign another role to all users before deleting this role.');

        $roleId = $role->id;
        $role->delete();
        $audit->log('admin.role_deleted', $request->user()->id, ['role_id' => $roleId]);

        return response()->json(['message' => 'Role deleted.']);
    }
}

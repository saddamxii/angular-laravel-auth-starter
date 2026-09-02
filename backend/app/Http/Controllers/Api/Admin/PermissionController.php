<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Permission;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PermissionController
{
    /** Add permission dialog -> validates stable permission code -> inserts permissions row -> audit_logs -> roles page reload. */
    public function store(Request $request, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:3', 'max:100', 'regex:/^[a-z][a-z0-9_.-]*$/', 'unique:permissions,name'],
            'display_name' => ['required', 'string', 'max:150'],
        ]);

        $permission = Permission::create([
            'name' => strtolower($validated['name']),
            'display_name' => $validated['display_name'],
        ]);

        $audit->log('admin.permission_created', $request->user()->id, ['permission_id' => $permission->id]);

        return response()->json(['permission' => $permission], 201);
    }
}

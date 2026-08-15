<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController
{
    public function index(Request $request): JsonResponse
    {
        $logs = AuditLog::query()
            ->with(['user:id,first_name,last_name,email'])
            ->when($request->string('event')->value(), fn ($query, string $event) => $query->where('event', $event))
            ->latest('created_at')
            ->paginate(min($request->integer('per_page', 50), 100));

        return response()->json($logs);
    }
}

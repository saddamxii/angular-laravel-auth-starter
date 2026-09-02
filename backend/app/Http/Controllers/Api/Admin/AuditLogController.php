<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AuditLogController
{
    /** Admin audit table -> filters/paginates audit_logs with actor users -> returns page data for AdminComponent. */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'event' => ['nullable', 'string', 'max:100'],
            'user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'ip_address' => ['nullable', 'ip'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $logs = AuditLog::query()
            ->with(['user:id,first_name,last_name,email'])
            ->when($validated['event'] ?? null, fn (Builder $query, string $event) => $query->where('event', $event))
            ->when($validated['user_id'] ?? null, fn (Builder $query, int $userId) => $query->where('user_id', $userId))
            ->when($validated['ip_address'] ?? null, fn (Builder $query, string $ipAddress) => $query->where('ip_address', $ipAddress))
            ->when($validated['from'] ?? null, fn (Builder $query, string $from) => $query->where('created_at', '>=', $from.' 00:00:00'))
            ->when($validated['to'] ?? null, fn (Builder $query, string $to) => $query->where('created_at', '<=', $to.' 23:59:59'))
            ->latest('created_at')
            ->paginate($validated['per_page'] ?? 25)
            ->withQueryString();

        return response()->json($logs);
    }

    /** Audit filter comboboxes -> distinct audit event values plus eligible users -> autocomplete options in AdminComponent. */
    public function options(): JsonResponse
    {
        return response()->json([
            'events' => AuditLog::query()
                ->select('event')
                ->distinct()
                ->orderBy('event')
                ->pluck('event'),
            'users' => User::query()
                ->select(['id', 'first_name', 'last_name', 'email'])
                ->orderBy('first_name')
                ->orderBy('last_name')
                ->limit(500)
                ->get(),
        ]);
    }
}

<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogger
{
    public function log(string $event, ?int $userId = null, array $metadata = [], ?Request $request = null): void
    {
        $request ??= request();

        AuditLog::create([
            'user_id' => $userId,
            'event' => $event,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'metadata' => $metadata,
            'created_at' => now(),
        ]);
    }
}

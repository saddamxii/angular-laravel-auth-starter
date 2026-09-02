<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Passkeys\Passkey;

class PasskeyController
{
    /** Settings/Passkeys -> reads passkeys where user_id=current user -> returns safe credential metadata, never private key material. */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'passkeys' => Passkey::query()
                ->where('user_id', $user->id)
                ->latest()
                ->get(['id', 'name', 'credential_id', 'last_used_at', 'created_at'])
                ->map(fn (Passkey $passkey) => [
                    'id' => $passkey->id,
                    'name' => $passkey->name,
                    'authenticator' => $passkey->authenticator,
                    'last_used_at' => $passkey->last_used_at,
                    'created_at' => $passkey->created_at,
                ]),
        ]);
    }

    /** Passkeys remove button -> verifies passkey ownership -> deletes only that passkeys row. */
    public function destroy(Request $request, Passkey $passkey): JsonResponse
    {
        abort_unless((int) $passkey->user_id === (int) $request->user()->id, 404);
        $passkey->delete();

        return response()->json(['message' => 'Passkey removed.']);
    }
}

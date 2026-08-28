<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;

class BrandingController
{
    public function show(): JsonResponse
    {
        $hex = static fn (mixed $value, string $fallback): string => is_string($value) && preg_match('/^#[0-9a-fA-F]{6}$/', $value) ? $value : $fallback;
        $theme = config('branding.theme') === 'dark' ? 'dark' : 'light';

        return response()->json([
            'name' => str(config('branding.name'))->limit(80, '')->toString(),
            'short_name' => str(config('branding.short_name'))->limit(4, '')->toString(),
            'logo_url' => filter_var(config('branding.logo_url'), FILTER_VALIDATE_URL) ?: null,
            'theme' => $theme,
            'primary_color' => $hex(config('branding.primary_color'), '#2363a4'),
            'accent_color' => $hex(config('branding.accent_color'), '#138460'),
        ]);
    }
}

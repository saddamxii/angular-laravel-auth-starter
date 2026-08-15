<?php

return [
    'relying_party_id' => env('WEBAUTHN_RP_ID', parse_url(config('app.url'), PHP_URL_HOST)),
    'allowed_origins' => [env('WEBAUTHN_ORIGIN', config('app.url'))],
    'user_handle_secret' => env('PASSKEYS_USER_HANDLE_SECRET', config('app.key')),
    'timeout' => 60000,

    // Passkey verification will issue the application's JWT through the API guard.
    'guard' => 'api',
    'middleware' => [],
    'management_middleware' => ['auth:api', 'access.token'],
    'throttle' => 'throttle:6,1',
    'redirect' => '/dashboard',
];

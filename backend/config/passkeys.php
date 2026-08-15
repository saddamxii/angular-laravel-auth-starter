<?php

return [
    'relying_party_id' => env('WEBAUTHN_RP_ID', parse_url(config('app.url'), PHP_URL_HOST)),
    'allowed_origins' => [env('WEBAUTHN_ORIGIN', config('app.url'))],
    'user_handle_secret' => env('PASSKEYS_USER_HANDLE_SECRET', config('app.key')),
    'timeout' => 60000,

    // Laravel's passkey server requires a stateful guard for WebAuthn login.
    // The custom response converts the verified web session into our JWT API session.
    'guard' => 'web',
    'middleware' => ['web'],
    'management_middleware' => ['auth:web'],
    'throttle' => 'throttle:6,1',
    'redirect' => '/dashboard',
];

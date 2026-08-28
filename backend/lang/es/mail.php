<?php

return [
    'greeting' => 'Hola :name,',
    'verify' => [
        'subject' => 'Verifica tu dirección de correo electrónico',
        'line' => 'Verifica tu dirección de correo electrónico para activar tu cuenta.',
        'action' => 'Verificar dirección de correo electrónico',
        'expiry' => 'Este enlace de verificación caduca en 60 minutos.',
    ],
    'reset' => [
        'subject' => 'Restablece tu contraseña',
        'line' => 'Recibes este correo porque hemos recibido una solicitud para restablecer la contraseña de tu cuenta.',
        'action' => 'Restablecer contraseña',
        'expiry' => 'Este enlace caduca en :minutes minutos.',
        'ignore' => 'Si no solicitaste un restablecimiento de contraseña, no es necesario realizar ninguna otra acción.',
    ],
    'email_change' => [
        'requested_subject' => 'Se solicitó un cambio de dirección de correo electrónico',
        'requested_line' => 'Se realizó una solicitud para cambiar la dirección de correo electrónico de tu cuenta a :email.',
        'requested_safe' => 'Tu dirección actual seguirá activa hasta que se verifique la nueva dirección.',
        'requested_warning' => 'Si no realizaste esta solicitud, restablece tu contraseña de inmediato.',
        'verify_subject' => 'Verifica tu nueva dirección de correo electrónico',
        'verify_line' => 'Se realizó una solicitud para cambiar la dirección de correo electrónico de tu cuenta a :email.',
        'verify_action' => 'Verificar nueva dirección de correo electrónico',
        'verify_expiry' => 'Este enlace caduca en 60 minutos. Si no solicitaste este cambio, puedes ignorar este mensaje.',
    ],
];

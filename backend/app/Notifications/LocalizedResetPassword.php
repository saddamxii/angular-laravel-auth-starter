<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword as BaseResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\URL;

class LocalizedResetPassword extends BaseResetPassword
{
    public function toMail($notifiable): MailMessage
    {
        $url = URL::temporarySignedRoute('password.reset', now()->addMinutes(config('auth.passwords.users.expire')), [
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ]);

        return (new MailMessage)
            ->subject(__('mail.reset.subject'))
            ->greeting(__('mail.greeting', ['name' => $notifiable->first_name]))
            ->line(__('mail.reset.line'))
            ->action(__('mail.reset.action'), $url)
            ->line(__('mail.reset.expiry', ['minutes' => config('auth.passwords.users.expire')]))
            ->line(__('mail.reset.ignore'));
    }
}

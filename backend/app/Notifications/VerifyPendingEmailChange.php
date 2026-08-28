<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VerifyPendingEmailChange extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $newEmail,
        public readonly string $verificationUrl,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('mail.email_change.verify_subject'))
            ->greeting(__('mail.greeting', ['name' => $notifiable->first_name]))
            ->line(__('mail.email_change.verify_line', ['email' => $this->newEmail]))
            ->action(__('mail.email_change.verify_action'), $this->verificationUrl)
            ->line(__('mail.email_change.verify_expiry'));
    }
}

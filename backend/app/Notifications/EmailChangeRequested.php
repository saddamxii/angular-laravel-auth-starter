<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EmailChangeRequested extends Notification
{
    use Queueable;

    public function __construct(private readonly string $newEmail)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('mail.email_change.requested_subject'))
            ->greeting(__('mail.greeting', ['name' => $notifiable->first_name]))
            ->line(__('mail.email_change.requested_line', ['email' => $this->newEmail]))
            ->line(__('mail.email_change.requested_safe'))
            ->line(__('mail.email_change.requested_warning'));
    }
}

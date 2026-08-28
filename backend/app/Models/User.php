<?php

namespace App\Models;

use App\Notifications\VerifyPendingEmailChange;
use App\Notifications\LocalizedVerifyEmail;
use App\Notifications\LocalizedResetPassword;
use Illuminate\Auth\MustVerifyEmail as MustVerifyEmailTrait;
use Illuminate\Auth\Passwords\CanResetPassword as CanResetPasswordTrait;
use Illuminate\Contracts\Auth\CanResetPassword;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Passkeys\Contracts\PasskeyUser;
use Laravel\Passkeys\PasskeyAuthenticatable;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;
use Illuminate\Support\Facades\URL;

class User extends Authenticatable implements JWTSubject, MustVerifyEmail, CanResetPassword, PasskeyUser
{
    use Notifiable, MustVerifyEmailTrait, CanResetPasswordTrait, PasskeyAuthenticatable;

    protected $fillable = [
        'first_name',
        'last_name',
        'username',
        'email',
        'locale',
        'password',
        'is_active',
        'avatar_path',
        'profile_preferences',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'pending_email',
        'pending_email_change_token',
    ];

    protected $appends = ['avatar_url'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'auth_version' => 'integer',
            'pending_email_change_expires_at' => 'datetime',
            'profile_preferences' => 'array',
        ];
    }

    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->avatar_path
            ? URL::temporarySignedRoute('profile.avatar', now()->addMinutes(15), ['user' => $this->id])
            : null;
    }

    public function preferredLocale(): string
    {
        return in_array($this->locale, ['en', 'fr', 'es'], true) ? $this->locale : config('app.fallback_locale');
    }

    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new LocalizedVerifyEmail());
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new LocalizedResetPassword($token));
    }

    public function routeNotificationForMail(object $notification): ?string
    {
        return $notification instanceof VerifyPendingEmailChange ? $notification->newEmail : $this->email;
    }

    public function getJWTCustomClaims(): array
    {
        return [];
    }

    public function getPasskeyDisplayName(): string
    {
        return trim($this->first_name.' '.$this->last_name) ?: $this->email;
    }

    public function getPasskeyUsername(): string
    {
        return $this->email;
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class)->withTimestamps();
    }

    public function authSessions()
    {
        return $this->hasMany(AuthSession::class);
    }

    public function hasRole(string $role): bool
    {
        return $this->roles()->where('name', $role)->exists();
    }

    public function hasAnyRole(array $roles): bool
    {
        return $this->roles()->whereIn('name', $roles)->exists();
    }

    public function hasPermission(string $permission): bool
    {
        return $this->roles()
            ->whereHas('permissions', fn ($query) => $query->where('name', $permission))
            ->exists();
    }
}

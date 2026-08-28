<?php

namespace Tests\Feature\Auth;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LocalePreferenceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_registration_uses_the_requested_locale_and_authenticated_user_can_update_it(): void
    {
        $this->withoutMiddleware(VerifyCsrfToken::class)
            ->withHeader('Accept-Language', 'fr-FR')
            ->postJson('/api/auth/register', [
                'first_name' => 'Jean', 'last_name' => 'Locale', 'username' => 'jeanlocale',
                'email' => 'jean-locale@example.test', 'password' => 'StrongPassword!123',
                'password_confirmation' => 'StrongPassword!123', 'terms_accepted' => true,
            ])->assertCreated();

        $this->assertDatabaseHas('users', ['email' => 'jean-locale@example.test', 'locale' => 'fr']);

        $user = User::where('email', 'jean-locale@example.test')->firstOrFail();
        $user->forceFill(['email_verified_at' => now()])->save();
        $token = $this->withoutMiddleware(VerifyCsrfToken::class)
            ->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'StrongPassword!123'])
            ->assertOk()->json('access_token');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/profile/locale', ['locale' => 'es'])
            ->assertOk()
            ->assertJsonPath('user.locale', 'es');

        $this->assertDatabaseHas('users', ['id' => $user->id, 'locale' => 'es']);
    }
}

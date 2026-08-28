<?php

namespace Tests\Feature\Auth;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_user_can_update_profile_upload_avatar_and_export_personal_data(): void
    {
        Storage::fake('local');
        $user = $this->user();
        $token = $this->tokenFor($user);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/profile', ['first_name' => 'Updated', 'last_name' => 'Profile', 'username' => 'updated_profile', 'preferences' => ['email_notifications' => false]])
            ->assertOk()
            ->assertJsonPath('user.username', 'updated_profile')
            ->assertJsonPath('user.profile_preferences.email_notifications', false);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->post('/api/profile/avatar', ['avatar' => UploadedFile::fake()->image('avatar.png', 200, 200)])
            ->assertOk()
            ->assertJsonStructure(['user' => ['avatar_url']]);

        $this->assertStringContainsString('/api/profile/avatar/'.$user->id, (string) $response->json('user.avatar_url'));

        $parts = parse_url((string) $response->json('user.avatar_url'));
        $this->get(($parts['path'] ?? '').(isset($parts['query']) ? '?'.$parts['query'] : ''))->assertOk();

        $user->refresh();
        Storage::disk('local')->assertExists($user->avatar_path);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/profile/export')
            ->assertOk()
            ->assertJsonPath('profile.email', $user->email)
            ->assertJsonMissingPath('profile.password');
    }

    public function test_account_deletion_requires_current_password_and_confirmation(): void
    {
        $user = $this->user();
        $token = $this->tokenFor($user);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson('/api/profile', ['current_password' => 'WrongPassword!123', 'confirmation' => 'DELETE'])
            ->assertUnprocessable();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson('/api/profile', ['current_password' => 'CurrentPassword!123', 'confirmation' => 'DELETE'])
            ->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    private function user(): User
    {
        $user = User::create(['first_name' => 'Profile', 'last_name' => 'Tester', 'username' => 'profile_tester', 'email' => 'profile@example.test', 'password' => Hash::make('CurrentPassword!123')]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $user->roles()->attach(Role::where('name', 'user')->firstOrFail());
        return $user;
    }

    private function tokenFor(User $user): string
    {
        return $this->withoutMiddleware(VerifyCsrfToken::class)
            ->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'CurrentPassword!123'])
            ->assertOk()->json('access_token');
    }
}

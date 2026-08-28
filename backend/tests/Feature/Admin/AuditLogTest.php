<?php

namespace Tests\Feature\Admin;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_admin_can_filter_audit_logs_and_read_filter_options(): void
    {
        $admin = $this->makeUser('admin', 'admin-audit@example.test');
        $target = $this->makeUser('user', 'target-audit@example.test');
        $other = $this->makeUser('user', 'other-audit@example.test');

        AuditLog::create(['user_id' => $target->id, 'event' => 'auth.login_failed', 'ip_address' => '203.0.113.10', 'metadata' => ['reason' => 'invalid_credentials'], 'created_at' => now()->subDay()]);
        AuditLog::create(['user_id' => $target->id, 'event' => 'auth.login_success', 'ip_address' => '203.0.113.10', 'metadata' => [], 'created_at' => now()]);
        AuditLog::create(['user_id' => $other->id, 'event' => 'auth.login_failed', 'ip_address' => '203.0.113.11', 'metadata' => [], 'created_at' => now()]);

        $this->withHeader('Authorization', 'Bearer '.$this->accessToken($admin))
            ->getJson('/api/admin/audit-logs?event=auth.login_failed&user_id='.$target->id.'&ip_address=203.0.113.10&from='.now()->subDays(2)->toDateString().'&to='.now()->toDateString())
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.event', 'auth.login_failed')
            ->assertJsonPath('data.0.user.email', $target->email);

        $this->withHeader('Authorization', 'Bearer '.$this->accessToken($admin))
            ->getJson('/api/admin/audit-logs/options')
            ->assertOk()
            ->assertJsonFragment(['auth.login_failed'])
            ->assertJsonFragment(['email' => $target->email]);
    }

    public function test_non_admin_cannot_read_audit_logs(): void
    {
        $user = $this->makeUser('user', 'regular-audit@example.test');

        $this->withHeader('Authorization', 'Bearer '.$this->accessToken($user))
            ->getJson('/api/admin/audit-logs')
            ->assertForbidden();
    }

    private function makeUser(string $role, string $email): User
    {
        $user = User::create([
            'first_name' => ucfirst($role),
            'last_name' => 'Audit',
            'username' => str($email)->before('@')->replace('-', '_')->toString(),
            'email' => $email,
            'password' => Hash::make('StrongPassword!123'),
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $user->roles()->attach(Role::where('name', $role)->firstOrFail()->id);

        return $user;
    }

    private function accessToken(User $user): string
    {
        return $this->withoutMiddleware(VerifyCsrfToken::class)
            ->postJson('/api/auth/login', [
                'email' => $user->email,
                'password' => 'StrongPassword!123',
            ])
            ->assertOk()
            ->json('access_token');
    }
}

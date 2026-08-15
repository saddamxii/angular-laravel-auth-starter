import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Passkeys } from '@laravel/passkeys';
import { AuthService, AuthSessionSummary, PasskeySummary } from '../../core/auth/auth.service';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule],
  template: `
    <main class="security-page">
      <section class="security-card">
        <a routerLink="/dashboard">← Dashboard</a>
        <h1>Security</h1>
        <p>Add a passkey to use Face ID, Touch ID, fingerprint, Windows Hello, or another device authenticator.</p>

        <mat-card appearance="outlined">
          <mat-card-header><mat-card-title>Passkeys</mat-card-title></mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline">
              <mat-label>Passkey name</mat-label>
              <input matInput [value]="name()" (input)="name.set($any($event.target).value)" placeholder="My laptop" />
            </mat-form-field>
            <button mat-flat-button (click)="addPasskey()" [disabled]="!name().trim() || loading()">
              {{ loading() ? 'Waiting for device…' : 'Add passkey' }}
            </button>
            <div class="items">
              @for (passkey of passkeys(); track passkey.id) {
                <div class="item">
                  <div><strong>{{ passkey.name }}</strong><small>{{ passkey.authenticator || 'Security authenticator' }}</small></div>
                  <button mat-stroked-button type="button" (click)="revokePasskey(passkey)" [disabled]="loading()">Remove</button>
                </div>
              } @empty { <p>No passkeys registered yet.</p> }
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card appearance="outlined">
          <mat-card-header><mat-card-title>Active sessions</mat-card-title></mat-card-header>
          <mat-card-content>
            <button mat-stroked-button type="button" (click)="revokeAllSessions()" [disabled]="loading() || !sessions().length">Sign out all devices</button>
            <div class="items">
              @for (session of sessions(); track session.id) {
                <div class="item">
                  <div><strong>{{ session.device_name || 'Unknown device' }}</strong><small>{{ session.ip_address || 'Unknown IP' }} · {{ session.last_used_at || session.created_at }}</small></div>
                  <button mat-stroked-button type="button" (click)="revokeSession(session)" [disabled]="loading()">Revoke</button>
                </div>
              } @empty { <p>No active sessions found.</p> }
            </div>
          </mat-card-content>
        </mat-card>

        @if (message()) { <p role="status">{{ message() }}</p> }
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      </section>
    </main>
  `,
  styles: `
    .security-page { min-height:100dvh; display:grid; place-items:center; padding:24px; background:#f7f9fc; }
    .security-card { width:min(100%,720px); padding:40px; background:#fff; border-radius:24px; box-shadow:0 24px 70px rgb(20 34 66 / 10%); display:grid; gap:20px; }
    .security-card a { text-decoration:none; }.security-card h1 { margin:0; }
    mat-card-content { display:grid; gap:16px; padding-top:16px; }.items { display:grid; gap:10px; }
    .item { display:flex; justify-content:space-between; align-items:center; gap:16px; padding:12px 0; border-top:1px solid #e8ebf0; }
    .item div { display:grid; gap:4px; }.item small { opacity:.7; }.error { color:#b42318; }
    @media (max-width:600px) { .security-card { padding:24px; }.item { align-items:flex-start; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityComponent implements OnInit {
  private readonly auth = inject(AuthService);
  readonly name = signal('My device');
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly passkeys = signal<PasskeySummary[]>([]);
  readonly sessions = signal<AuthSessionSummary[]>([]);

  ngOnInit(): void { this.loadSecurityData(); }

  async addPasskey(): Promise<void> {
    this.loading.set(true); this.message.set(null); this.error.set(null);
    try {
      await Passkeys.register({ name: this.name().trim() });
      this.message.set('Passkey registered successfully.');
      this.loadSecurityData();
    } catch { this.error.set('The passkey could not be registered. Please try again.'); }
    finally { this.loading.set(false); }
  }

  revokePasskey(passkey: PasskeySummary): void {
    if (!confirm(`Remove passkey “${passkey.name}”?`)) return;
    this.loading.set(true); this.auth.revokePasskey(passkey.id).subscribe({
      next: (response) => { this.message.set(response.message); this.loadSecurityData(); },
      error: () => this.error.set('Unable to remove this passkey.'),
      complete: () => this.loading.set(false),
    });
  }

  revokeSession(session: AuthSessionSummary): void {
    if (!confirm('Revoke this authentication session?')) return;
    this.loading.set(true); this.auth.revokeSession(session.id).subscribe({
      next: (response) => { this.message.set(response.message); this.loadSecurityData(); },
      error: () => this.error.set('Unable to revoke this session.'),
      complete: () => this.loading.set(false),
    });
  }

  revokeAllSessions(): void {
    if (!confirm('Sign out all devices?')) return;
    this.loading.set(true); this.auth.revokeAllSessions().subscribe({
      next: (response) => { this.message.set(response.message); this.loadSecurityData(); },
      error: () => this.error.set('Unable to revoke all sessions.'),
      complete: () => this.loading.set(false),
    });
  }

  private loadSecurityData(): void {
    this.auth.listPasskeys().subscribe({ next: (response) => this.passkeys.set(response.passkeys), error: () => this.error.set('Unable to load passkeys.') });
    this.auth.listSessions().subscribe({ next: (response) => this.sessions.set(response.sessions), error: () => this.error.set('Unable to load sessions.') });
  }
}

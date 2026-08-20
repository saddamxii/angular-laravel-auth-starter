import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Passkeys } from '@laravel/passkeys';
import { firstValueFrom } from 'rxjs';
import { AuthService, AuthSessionSummary, PasskeySummary } from '../../core/auth/auth.service';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule],
  templateUrl: './security.component.html',
  styleUrl: './security.component.scss',
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
      await firstValueFrom(this.auth.initializeCsrf());
      await Passkeys.register({ name: this.name().trim() });
      this.message.set('Passkey registered successfully.');
      this.loadSecurityData();
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'The passkey could not be registered. Please try again.');
    }
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

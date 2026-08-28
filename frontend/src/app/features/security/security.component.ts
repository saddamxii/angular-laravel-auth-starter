import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Passkeys } from '@laravel/passkeys';
import { firstValueFrom } from 'rxjs';
import { AuthService, AuthSessionSummary, PasskeySummary } from '../../core/auth/auth.service';
import { TranslationService } from '../../core/i18n/translation.service';
import { AppSidebarComponent } from '../../core/layout/app-sidebar.component';
import { SidebarStateService } from '../../core/layout/sidebar-state.service';
import { AppTopbarComponent } from '../../core/layout/app-topbar.component';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, AppSidebarComponent, AppTopbarComponent],
  templateUrl: './security.component.html',
  styleUrls: ['./security.component.scss', './security-forms.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly sidebar = inject(SidebarStateService);
  readonly i18n = inject(TranslationService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly name = signal('My device');
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly passkeys = signal<PasskeySummary[]>([]);
  readonly sessions = signal<AuthSessionSummary[]>([]);
  readonly activeSection = signal<'account' | 'passkeys' | 'sessions'>('account');
  readonly showCurrentPassword = signal(false);
  readonly showNewPassword = signal(false);
  readonly showConfirmationPassword = signal(false);
  readonly showEmailCurrentPassword = signal(false);
  readonly passwordForm = this.fb.nonNullable.group({
    current_password: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(12)]],
    password_confirmation: ['', Validators.required],
  });
  readonly emailForm = this.fb.nonNullable.group({
    current_password: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    this.route.data.subscribe(({ section }) => this.activeSection.set(section === 'passkeys' || section === 'sessions' ? section : 'account'));
    this.loadSecurityData();
  }

  pageTitle(): string { return this.activeSection() === 'account' ? 'Account security' : this.activeSection() === 'passkeys' ? this.i18n.t('security.passkeys') : 'Sessions and data'; }
  pageDescription(): string { return this.activeSection() === 'account' ? 'Change sensitive account credentials securely.' : this.activeSection() === 'passkeys' ? 'Use your device to sign in faster and more securely.' : 'Control signed-in devices and your personal data.'; }
  pageIcon(): string { return this.activeSection() === 'account' ? 'security' : this.activeSection() === 'passkeys' ? 'fingerprint' : 'devices'; }
  toggleCurrentPassword(): void { this.showCurrentPassword.update((value) => !value); }
  toggleNewPassword(): void { this.showNewPassword.update((value) => !value); }
  toggleConfirmationPassword(): void { this.showConfirmationPassword.update((value) => !value); }
  toggleEmailCurrentPassword(): void { this.showEmailCurrentPassword.update((value) => !value); }

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/login'));
  }

  async addPasskey(): Promise<void> {
    this.loading.set(true); this.message.set(null); this.error.set(null);
    try {
      await firstValueFrom(this.auth.initializeCsrf());
      await Passkeys.register({ name: this.name().trim() });
      this.message.set(this.i18n.t('security.passkey_added'));
      this.loadSecurityData();
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : this.i18n.t('security.passkey_error'));
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

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    if (this.passwordForm.controls.password.value !== this.passwordForm.controls.password_confirmation.value) {
      this.error.set(this.i18n.t('security.password_mismatch'));
      return;
    }
    if (!confirm('Changing your password will sign out all other devices. Continue?')) return;

    this.loading.set(true);
    this.message.set(null);
    this.error.set(null);
    this.auth.changePassword(this.passwordForm.getRawValue()).subscribe({
      next: () => {
        this.passwordForm.reset();
        this.message.set(this.i18n.t('security.password_changed'));
        this.loadSecurityData();
      },
      error: (error: { error?: { message?: string } }) => {
        this.error.set(error.error?.message ?? this.i18n.t('security.password_error'));
      },
      complete: () => this.loading.set(false),
    });
  }

  requestEmailChange(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }
    if (!confirm('A verification link will be sent to the new email address. Your current email will remain active until it is verified. Continue?')) return;

    this.loading.set(true);
    this.message.set(null);
    this.error.set(null);
    this.auth.requestEmailChange(this.emailForm.getRawValue()).subscribe({
      next: (response) => {
        this.emailForm.reset();
        this.message.set(response.message);
      },
      error: (error: { error?: { message?: string } }) => {
        this.error.set(error.error?.message ?? 'Unable to request the email change.');
      },
      complete: () => this.loading.set(false),
    });
  }

  downloadExport(): void {
    this.auth.exportProfile().subscribe({ next: (data) => { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); link.download = 'my-personal-data.json'; link.click(); URL.revokeObjectURL(link.href); }, error: () => this.error.set('Unable to export your data.') });
  }

  deleteAccount(): void {
    const currentPassword = prompt('Enter your current password to permanently delete your account.');
    if (!currentPassword || prompt('Type DELETE to confirm permanent account deletion.') !== 'DELETE') return;
    this.loading.set(true); this.auth.deleteProfile({ current_password: currentPassword, confirmation: 'DELETE' }).subscribe({ next: () => { this.auth.logout().subscribe(() => this.router.navigateByUrl('/login')); }, error: (error: { error?: { message?: string } }) => this.error.set(error.error?.message ?? 'Unable to delete your account.'), complete: () => this.loading.set(false) });
  }

  private loadSecurityData(): void {
    this.auth.listPasskeys().subscribe({ next: (response) => this.passkeys.set(response.passkeys), error: () => this.error.set('Unable to load passkeys.') });
    this.auth.listSessions().subscribe({ next: (response) => this.sessions.set(response.sessions), error: () => this.error.set('Unable to load sessions.') });
  }
}

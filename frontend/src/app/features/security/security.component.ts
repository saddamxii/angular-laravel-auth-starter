import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Passkeys } from '@laravel/passkeys';
import { firstValueFrom } from 'rxjs';
import { AuthService, PasskeySummary } from '../../core/auth/auth.service';
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
  /** Settings flow: Account forms update sensitive users fields; Passkeys uses WebAuthn then reads/deletes rows from Laravel's passkeys table. */
  readonly auth = inject(AuthService);
  readonly sidebar = inject(SidebarStateService);
  readonly i18n = inject(TranslationService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  readonly name = signal('My device');
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly passkeys = signal<PasskeySummary[]>([]);
  readonly activeSection = signal<'account' | 'passkeys'>('account');
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

  /** Route data chooses Account or Passkeys; only the Passkeys destination requires a passkeys-table read. */
  ngOnInit(): void {
    this.route.data.subscribe(({ section }) => {
      const activeSection = section === 'passkeys' ? 'passkeys' : 'account';
      this.activeSection.set(activeSection);
      if (activeSection === 'passkeys') this.loadPasskeys();
    });
  }

  toggleCurrentPassword(): void { this.showCurrentPassword.update((value) => !value); }
  toggleNewPassword(): void { this.showNewPassword.update((value) => !value); }
  toggleConfirmationPassword(): void { this.showConfirmationPassword.update((value) => !value); }
  toggleEmailCurrentPassword(): void { this.showEmailCurrentPassword.update((value) => !value); }

  /** Device-name input -> WebAuthn browser ceremony -> Laravel package writes passkeys row -> reloads the passkey list. */
  async addPasskey(): Promise<void> {
    this.loading.set(true); this.message.set(null); this.error.set(null);
    try {
      await firstValueFrom(this.auth.initializeCsrf());
      await Passkeys.register({ name: this.name().trim() });
      this.message.set(this.i18n.t('security.passkey_added'));
      this.loadPasskeys();
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : this.i18n.t('security.passkey_error'));
    }
    finally { this.loading.set(false); }
  }

  /** Passkey row remove button -> DELETE /passkeys/{id} -> owned passkeys record is deleted, then list reloads. */
  revokePasskey(passkey: PasskeySummary): void {
    if (!confirm(`Remove passkey “${passkey.name}”?`)) return;
    this.loading.set(true); this.auth.revokePasskey(passkey.id).subscribe({
      next: (response) => { this.message.set(response.message); this.loadPasskeys(); },
      error: () => this.error.set('Unable to remove this passkey.'),
      complete: () => this.loading.set(false),
    });
  }

  /** Account password form -> PUT /profile/password -> users.password/auth_version and auth_sessions -> new AuthService identity. */
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
      },
      error: (error: { error?: { message?: string } }) => {
        this.error.set(error.error?.message ?? this.i18n.t('security.password_error'));
      },
      complete: () => this.loading.set(false),
    });
  }

  /** Account email form -> PUT /profile/email -> users.pending_email/token and mail notifications -> signed verification route. */
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

  /** GET /passkeys -> filters passkeys by current users.id -> passkeys signal rendered in Settings. */
  private loadPasskeys(): void {
    this.auth.listPasskeys().subscribe({ next: (response) => this.passkeys.set(response.passkeys), error: () => this.error.set('Unable to load passkeys.') });
  }
}

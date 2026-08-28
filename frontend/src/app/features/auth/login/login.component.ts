import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Passkeys } from '@laravel/passkeys';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { TranslationService } from '../../../core/i18n/translation.service';
import { BrandIdentityComponent } from '../../../core/branding/brand-identity.component';
import { BrandingService } from '../../../core/branding/branding.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, BrandIdentityComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  readonly i18n = inject(TranslationService);
  readonly branding = inject(BrandingService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(
    this.route.snapshot.queryParamMap.get('verified') === '1'
      ? 'Email verified successfully. You can now sign in.'
      : this.route.snapshot.queryParamMap.get('email_changed') === '1'
        ? 'Your email address has been changed. Please sign in again.'
        : null,
  );

  readonly form = this.fb.nonNullable.group({
    login: ['', [Validators.required, Validators.maxLength(255)]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: (error: { error?: { message?: string } }) => {
        this.errorMessage.set(error.error?.message ?? 'Unable to sign in. Please try again.');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  async passkeyLogin(): Promise<void> {
    this.errorMessage.set(null);
    this.loading.set(true);

    try {
      await firstValueFrom(this.auth.initializeCsrf());
      await Passkeys.verify();
      const restored = await firstValueFrom(this.auth.restoreSession());
      if (!restored) throw new Error('Passkey authentication did not create a valid application session.');
      await this.router.navigateByUrl('/dashboard');
    } catch (error: unknown) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Passkey authentication was cancelled or is unavailable on this device.');
    } finally {
      this.loading.set(false);
    }
  }
}

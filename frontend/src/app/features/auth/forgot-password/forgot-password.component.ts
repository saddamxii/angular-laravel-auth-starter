import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../core/auth/auth.service';
import { TranslationService } from '../../../core/i18n/translation.service';
import { BrandIdentityComponent } from '../../../core/branding/brand-identity.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, BrandIdentityComponent],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  readonly i18n = inject(TranslationService);
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.auth.forgotPassword(this.form.getRawValue()).subscribe({
      next: (response) => this.message.set(response.message),
      error: () => this.message.set('If the email exists, a password reset link has been sent.'),
      complete: () => this.loading.set(false),
    });
  }
}

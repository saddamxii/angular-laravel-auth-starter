import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../core/auth/auth.service';
import { TranslationService } from '../../../core/i18n/translation.service';
import { BrandIdentityComponent } from '../../../core/branding/brand-identity.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, BrandIdentityComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  readonly i18n = inject(TranslationService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    first_name: ['', [Validators.required, Validators.maxLength(100)]],
    last_name: ['', [Validators.required, Validators.maxLength(100)]],
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30), Validators.pattern(/^[A-Za-z0-9_]+$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(12)]],
    password_confirmation: ['', [Validators.required]],
    terms_accepted: [false, Validators.requiredTrue],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.form.controls.password.value !== this.form.controls.password_confirmation.value) {
      this.errorMessage.set('Passwords do not match.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.auth.register(this.form.getRawValue()).subscribe({
      next: (response) => {
        this.successMessage.set(response.message);
        this.loading.set(false);
        setTimeout(() => void this.router.navigateByUrl('/login'), 1200);
      },
      error: (error: { error?: { message?: string } }) => {
        this.errorMessage.set(error.error?.message ?? 'Unable to create your account.');
        this.loading.set(false);
      },
    });
  }
}

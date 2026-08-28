import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../core/auth/auth.service';
import { TranslationService } from '../../../core/i18n/translation.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  readonly i18n = inject(TranslationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group({ password: ['', [Validators.required, Validators.minLength(12)]], password_confirmation: ['', [Validators.required]] });

  submit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    const email = this.route.snapshot.queryParamMap.get('email');
    if (this.form.invalid || !token || !email) return;
    if (this.form.controls.password.value !== this.form.controls.password_confirmation.value) {
      this.message.set('Passwords do not match.');
      return;
    }

    this.loading.set(true);
    this.auth.resetPassword({ token, email, ...this.form.getRawValue() }).subscribe({
      next: (response) => { this.message.set(response.message); setTimeout(() => void this.router.navigateByUrl('/login'), 1200); },
      error: (error: HttpErrorResponse) => {
        this.message.set(error.error?.message ?? 'The reset link is invalid or expired.');
      },
      complete: () => this.loading.set(false),
    });
  }
}

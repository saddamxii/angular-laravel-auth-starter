import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <main class="auth-shell"><section class="auth-card">
      <a routerLink="/login">← Sign in</a><h1>Forgot password?</h1>
      <p>Enter your email and we'll send a reset link if an account exists.</p>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline"><mat-label>Email</mat-label><input matInput type="email" formControlName="email" autocomplete="email" /></mat-form-field>
        @if (message()) { <p role="status">{{ message() }}</p> }
        <button mat-flat-button type="submit" [disabled]="form.invalid || loading()">{{ loading() ? 'Sending…' : 'Send reset link' }}</button>
      </form>
    </section></main>
  `,
  styles: `.auth-shell{min-height:100dvh;display:grid;place-items:center;padding:24px;background:#f7f9fc}.auth-card{width:min(100%,440px);padding:40px;background:#fff;border-radius:24px;box-shadow:0 24px 70px rgb(20 34 66 / 10%)}.auth-card form{display:grid;gap:14px}.auth-card a{text-decoration:none}`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
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

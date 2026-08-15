import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <main class="auth-shell">
      <section class="auth-card" aria-labelledby="login-title">
        <div class="brand">Auth Starter</div>
        <h1 id="login-title">Welcome back</h1>
        <p class="subtitle">Sign in securely to continue.</p>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" />
            <button mat-icon-button matSuffix type="button" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'">
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          @if (errorMessage()) {
            <p class="error" role="alert">{{ errorMessage() }}</p>
          }

          <button mat-flat-button class="primary-action" type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Signing in…' : 'Sign in' }}
          </button>

          <div class="divider"><span>or</span></div>

          <button mat-stroked-button type="button" class="passkey-action" (click)="passkeyLogin()" [disabled]="loading()">
            <mat-icon>fingerprint</mat-icon>
            Sign in with passkey
          </button>
        </form>

        <p class="footer-text">Don't have an account? <a routerLink="/register">Create one</a></p>
      </section>
    </main>
  `,
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
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
    try {
      const { Passkeys } = await import('@laravel/passkeys');
      await Passkeys.verify();
      await this.auth.restoreSession().toPromise();
      await this.router.navigateByUrl('/dashboard');
    } catch {
      this.errorMessage.set('Passkey authentication was cancelled or is unavailable on this device.');
    }
  }
}

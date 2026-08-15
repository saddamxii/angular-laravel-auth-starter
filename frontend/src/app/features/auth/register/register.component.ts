import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule],
  template: `
    <main class="auth-shell">
      <section class="auth-card" aria-labelledby="register-title">
        <a routerLink="/login">← Sign in</a>
        <h1 id="register-title">Create your account</h1>
        <p class="subtitle">Secure access starts here.</p>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="two-col">
            <mat-form-field appearance="outline"><mat-label>First name</mat-label><input matInput formControlName="first_name" autocomplete="given-name" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Last name</mat-label><input matInput formControlName="last_name" autocomplete="family-name" /></mat-form-field>
          </div>
          <mat-form-field appearance="outline"><mat-label>Email</mat-label><input matInput type="email" formControlName="email" autocomplete="email" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Password</mat-label><input matInput type="password" formControlName="password" autocomplete="new-password" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Confirm password</mat-label><input matInput type="password" formControlName="password_confirmation" autocomplete="new-password" /></mat-form-field>
          <mat-checkbox formControlName="terms_accepted">I accept the terms and conditions.</mat-checkbox>

          @if (errorMessage()) { <p class="error" role="alert">{{ errorMessage() }}</p> }
          @if (successMessage()) { <p class="success" role="status">{{ successMessage() }}</p> }

          <button mat-flat-button class="primary-action" type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Creating account…' : 'Create account' }}
          </button>
        </form>
      </section>
    </main>
  `,
  styles: `
    .auth-shell { min-height:100dvh; display:grid; place-items:center; padding:24px; background:linear-gradient(135deg,#f7f9fc 0%,#eef3ff 100%); }
    .auth-card { width:min(100%,560px); padding:clamp(28px,6vw,48px); border-radius:24px; background:#fff; box-shadow:0 24px 70px rgb(20 34 66 / 12%); }
    .auth-card > a { text-decoration:none; }
    h1 { margin:28px 0 8px; }
    .subtitle { color:#687386; margin-bottom:28px; }
    form { display:grid; gap:14px; }
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .primary-action { min-height:50px; border-radius:12px; }
    .error { color:#b42318; }
    .success { color:#067647; }
    @media (max-width:560px) { .two-col { grid-template-columns:1fr; } .auth-shell { padding:12px; } .auth-card { border-radius:18px; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    first_name: ['', [Validators.required, Validators.maxLength(100)]],
    last_name: ['', [Validators.required, Validators.maxLength(100)]],
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

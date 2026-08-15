import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <main class="auth-shell"><section class="auth-card">
      <a routerLink="/login">← Sign in</a><h1>Reset password</h1>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline"><mat-label>New password</mat-label><input matInput type="password" formControlName="password" autocomplete="new-password" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Confirm password</mat-label><input matInput type="password" formControlName="password_confirmation" autocomplete="new-password" /></mat-form-field>
        @if (message()) { <p role="status">{{ message() }}</p> }
        <button mat-flat-button type="submit" [disabled]="form.invalid || loading()">{{ loading() ? 'Resetting…' : 'Reset password' }}</button>
      </form>
    </section></main>
  `,
  styles: `.auth-shell{min-height:100dvh;display:grid;place-items:center;padding:24px;background:#f7f9fc}.auth-card{width:min(100%,440px);padding:40px;background:#fff;border-radius:24px;box-shadow:0 24px 70px rgb(20 34 66 / 10%)}.auth-card form{display:grid;gap:14px}.auth-card a{text-decoration:none}`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
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
      error: () => this.message.set('The reset link is invalid or expired.'),
      complete: () => this.loading.set(false),
    });
  }
}

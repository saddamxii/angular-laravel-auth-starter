import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService, AuthSessionSummary } from '../../core/auth/auth.service';
import { TranslationService } from '../../core/i18n/translation.service';
import { AppSidebarComponent } from '../../core/layout/app-sidebar.component';
import { SidebarStateService } from '../../core/layout/sidebar-state.service';
import { AppTopbarComponent } from '../../core/layout/app-topbar.component';

@Component({
  selector: 'app-profile', standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, AppSidebarComponent, AppTopbarComponent],
  templateUrl: './profile.component.html', styleUrls: ['./profile.component.scss', './profile-cards.component.scss'], changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly sidebar = inject(SidebarStateService);
  readonly i18n = inject(TranslationService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly sessions = signal<AuthSessionSummary[]>([]);
  readonly form = this.fb.nonNullable.group({
    first_name: ['', Validators.required], last_name: ['', Validators.required], username: ['', [Validators.required, Validators.minLength(3)]], email_notifications: [true],
  });

  ngOnInit(): void {
    const user = this.auth.user();
    if (user) this.form.patchValue({ first_name: user.first_name, last_name: user.last_name, username: user.username ?? '', email_notifications: user.profile_preferences?.email_notifications ?? true });
    this.loadSessions();
  }
  logout(): void { this.auth.logout().subscribe(() => this.router.navigateByUrl('/login')); }
  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue(); this.loading.set(true); this.message.set(null); this.error.set(null);
    this.auth.updateProfile({ first_name: value.first_name, last_name: value.last_name, username: value.username, preferences: { email_notifications: value.email_notifications } }).subscribe({
      next: () => this.message.set('Profile saved.'), error: (error: { error?: { message?: string } }) => this.error.set(error.error?.message ?? 'Unable to save your profile.'), complete: () => this.loading.set(false),
    });
  }
  uploadAvatar(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.loading.set(true); this.message.set(null); this.error.set(null);
    this.auth.uploadAvatar(file).subscribe({ next: () => this.message.set('Profile photo updated.'), error: (error: { error?: { message?: string } }) => this.error.set(error.error?.message ?? 'Unable to upload this photo.'), complete: () => this.loading.set(false) });
  }
  revokeSession(session: AuthSessionSummary): void {
    if (!confirm('Revoke this authentication session?')) return;
    this.loading.set(true); this.auth.revokeSession(session.id).subscribe({ next: (response) => { this.message.set(response.message); this.loadSessions(); }, error: () => this.error.set('Unable to revoke this session.'), complete: () => this.loading.set(false) });
  }
  revokeAllSessions(): void {
    if (!confirm('Sign out all devices?')) return;
    this.loading.set(true); this.auth.revokeAllSessions().subscribe({ next: (response) => { this.message.set(response.message); this.loadSessions(); }, error: () => this.error.set('Unable to revoke all sessions.'), complete: () => this.loading.set(false) });
  }
  downloadExport(): void {
    this.auth.exportProfile().subscribe({ next: (data) => { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); link.download = 'my-personal-data.json'; link.click(); URL.revokeObjectURL(link.href); }, error: () => this.error.set('Unable to export your data.') });
  }
  deleteAccount(): void {
    const currentPassword = prompt('Enter your current password to permanently delete your account.');
    if (!currentPassword || prompt('Type DELETE to confirm permanent account deletion.') !== 'DELETE') return;
    this.loading.set(true); this.auth.deleteProfile({ current_password: currentPassword, confirmation: 'DELETE' }).subscribe({ next: () => { this.auth.logout().subscribe(() => this.router.navigateByUrl('/login')); }, error: (error: { error?: { message?: string } }) => this.error.set(error.error?.message ?? 'Unable to delete your account.'), complete: () => this.loading.set(false) });
  }
  private loadSessions(): void { this.auth.listSessions().subscribe({ next: (response) => this.sessions.set(response.sessions), error: () => this.error.set('Unable to load sessions.') }); }
}

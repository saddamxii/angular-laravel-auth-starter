import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService, AuthSessionSummary } from '../../core/auth/auth.service';
import { AppSidebarComponent } from '../../core/layout/app-sidebar.component';
import { SidebarStateService } from '../../core/layout/sidebar-state.service';
import { AppTopbarComponent } from '../../core/layout/app-topbar.component';

@Component({
  selector: 'app-profile', standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, AppSidebarComponent, AppTopbarComponent],
  templateUrl: './profile.component.html', styleUrls: ['./profile.component.scss', './profile-cards.component.scss'], changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  /** My profile data flow: AuthService.currentUser supplies users data; save/upload update users and avatar storage; session actions read/revoke auth_sessions. */
  readonly auth = inject(AuthService);
  readonly sidebar = inject(SidebarStateService);
  private readonly fb = inject(FormBuilder);
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly sessions = signal<AuthSessionSummary[]>([]);
  readonly form = this.fb.nonNullable.group({
    first_name: ['', Validators.required], last_name: ['', Validators.required], username: ['', [Validators.required, Validators.minLength(3)]],
  });

  /** Route /settings/profile -> copies current users fields into the form and loads that user's auth_sessions. */
  ngOnInit(): void {
    const user = this.auth.user();
    if (user) this.form.patchValue({ first_name: user.first_name, last_name: user.last_name, username: user.username ?? '' });
    this.loadSessions();
  }
  /** Profile form -> PUT /profile -> users fields/preferences + audit_logs -> AuthService currentUser updates header/sidebar. */
  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue(); this.loading.set(true); this.message.set(null); this.error.set(null);
    this.auth.updateProfile({ first_name: value.first_name, last_name: value.last_name, username: value.username }).subscribe({
      next: () => this.message.set('Profile saved.'), error: (error: { error?: { message?: string } }) => this.error.set(error.error?.message ?? 'Unable to save your profile.'), complete: () => this.loading.set(false),
    });
  }
  /** File input -> POST /profile/avatar -> storage avatar file + users.avatar_path -> signed avatar URL refresh. */
  uploadAvatar(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.loading.set(true); this.message.set(null); this.error.set(null);
    this.auth.uploadAvatar(file).subscribe({ next: () => this.message.set('Profile photo updated.'), error: (error: { error?: { message?: string } }) => this.error.set(error.error?.message ?? 'Unable to upload this photo.'), complete: () => this.loading.set(false) });
  }
  /** Device row -> DELETE /sessions/{id} -> auth_sessions.revoked_at -> reloads the visible devices. */
  revokeSession(session: AuthSessionSummary): void {
    if (!confirm('Revoke this authentication session?')) return;
    this.loading.set(true); this.auth.revokeSession(session.id).subscribe({ next: (response) => { this.message.set(response.message); this.loadSessions(); }, error: () => this.error.set('Unable to revoke this session.'), complete: () => this.loading.set(false) });
  }
  /** Sign out all button -> DELETE /sessions -> revokes all auth_sessions for the authenticated users row. */
  revokeAllSessions(): void {
    if (!confirm('Sign out all devices?')) return;
    this.loading.set(true); this.auth.revokeAllSessions().subscribe({ next: (response) => { this.message.set(response.message); this.loadSessions(); }, error: () => this.error.set('Unable to revoke all sessions.'), complete: () => this.loading.set(false) });
  }
  /** GET /sessions -> SessionController filters auth_sessions by current user -> sessions signal used by the device list. */
  private loadSessions(): void { this.auth.listSessions().subscribe({ next: (response) => this.sessions.set(response.sessions), error: () => this.error.set('Unable to load sessions.') }); }
}

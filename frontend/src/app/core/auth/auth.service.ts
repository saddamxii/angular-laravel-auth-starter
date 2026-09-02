import { HttpClient } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, User } from './auth.models';
import { TranslationService, type AppLocale } from '../i18n/translation.service';

export interface PasskeySummary {
  id: number;
  name: string;
  authenticator: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface AuthSessionSummary {
  id: number;
  device_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  last_used_at: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  /**
   * Frontend authentication gateway. Components call this service; it calls the Laravel
   * routes in backend/routes/api.php, which read/write users, roles, auth_sessions and passkeys.
   * Successful responses are copied into Angular signals and then consumed by guards, the sidebar and pages.
   */
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly i18n = inject(TranslationService);
  private readonly accessToken = signal<string | null>(null);
  private readonly currentUser = signal<User | null>(null);
  private csrfToken: string | null = null;
  private refreshInFlight$: Observable<AuthResponse> | null = null;
  private csrfInFlight$: Observable<void> | null = null;

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null && this.accessToken() !== null);

  /** Form Register -> POST /auth/register -> users + role_user -> verification email -> Register page message. */
  register(payload: RegisterRequest): Observable<{ message: string }> {
    return this.withCsrf(() => this.http.post<{ message: string }>(`${environment.apiUrl}/auth/register`, payload, { withCredentials: true }));
  }

  /** Login form -> POST /auth/login -> users lookup + auth_sessions row -> JWT signal -> /dashboard. */
  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.withCsrf(() => this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload, { withCredentials: true })).pipe(
      tap((response) => this.applyAuthentication(response)),
    );
  }

  /** Forgot-password form -> Laravel password broker table -> reset email -> confirmation shown on the same page. */
  forgotPassword(payload: { email: string }): Observable<{ message: string }> {
    return this.withCsrf(() => this.http.post<{ message: string }>(`${environment.apiUrl}/auth/password/forgot`, payload, { withCredentials: true }));
  }

  /** Reset-password form -> validates broker token -> updates users.password -> Login page can authenticate with the new secret. */
  resetPassword(payload: { token: string; email: string; password: string; password_confirmation: string }): Observable<{ message: string }> {
    return this.withCsrf(() => this.http.post<{ message: string }>(`${environment.apiUrl}/auth/password/reset`, payload, { withCredentials: true }));
  }

  /** Account page -> users.password/auth_version + auth_sessions revocation -> refreshed Angular JWT/user signals. */
  changePassword(payload: { current_password: string; password: string; password_confirmation: string }): Observable<AuthResponse> {
    return this.withCsrf(() => this.http.put<AuthResponse>(`${environment.apiUrl}/profile/password`, payload, { withCredentials: true })).pipe(
      tap((response) => this.applyAuthentication(response)),
    );
  }

  /** Account page -> users.pending_email fields -> notification emails -> signed backend link -> Login page after confirmation. */
  requestEmailChange(payload: { current_password: string; email: string }): Observable<{ message: string }> {
    return this.withCsrf(() => this.http.put<{ message: string }>(`${environment.apiUrl}/profile/email`, payload, { withCredentials: true }));
  }

  /** Topbar language selection -> users.locale -> currentUser signal -> TranslationService updates the document language. */
  updateLocale(locale: AppLocale): Observable<{ user: User }> {
    return this.withCsrf(() => this.http.put<{ user: User }>(`${environment.apiUrl}/profile/locale`, { locale }, { withCredentials: true })).pipe(
      tap((response) => this.currentUser.set(response.user)),
    );
  }

  /** My profile form -> users identity/profile_preferences columns -> currentUser signal refreshes the sidebar and topbar. */
  updateProfile(payload: { first_name: string; last_name: string; username: string; preferences?: { email_notifications: boolean } }): Observable<{ user: User }> {
    return this.withCsrf(() => this.http.put<{ user: User }>(`${environment.apiUrl}/profile`, payload, { withCredentials: true })).pipe(tap((response) => this.currentUser.set(response.user)));
  }

  /** Profile image input -> storage/app/public/avatars + users.avatar_path -> signed avatar URL in currentUser. */
  uploadAvatar(file: File): Observable<{ user: User }> {
    const data = new FormData(); data.append('avatar', file);
    return this.withCsrf(() => this.http.post<{ user: User }>(`${environment.apiUrl}/profile/avatar`, data, { withCredentials: true })).pipe(tap((response) => this.currentUser.set(response.user)));
  }

  /** Optional privacy export -> ProfileController reads users, auth_sessions, passkeys and audit_logs -> JSON download caller. */
  exportProfile(): Observable<Record<string, unknown>> { return this.http.get<Record<string, unknown>>(`${environment.apiUrl}/profile/export`); }

  /** Optional destructive privacy action -> ProfileController deletes the authenticated users row and related records. */
  deleteProfile(payload: { current_password: string; confirmation: 'DELETE' }): Observable<{ message: string }> {
    return this.withCsrf(() => this.http.delete<{ message: string }>(`${environment.apiUrl}/profile`, { body: payload, withCredentials: true }));
  }

  /** Passkeys page -> passkeys table filtered by authenticated users.id -> list signal in SecurityComponent. */
  listPasskeys(): Observable<{ passkeys: PasskeySummary[] }> {
    return this.http.get<{ passkeys: PasskeySummary[] }>(`${environment.apiUrl}/passkeys`);
  }

  /** Passkey remove action -> deletes the owned passkeys row -> SecurityComponent reloads the list. */
  revokePasskey(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/passkeys/${id}`);
  }

  /** My profile -> auth_sessions table for users.id -> active device list. */
  listSessions(): Observable<{ sessions: AuthSessionSummary[] }> {
    return this.http.get<{ sessions: AuthSessionSummary[] }>(`${environment.apiUrl}/sessions`);
  }

  /** My profile revoke button -> marks one auth_sessions row revoked -> device list reloads. */
  revokeSession(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/sessions/${id}`);
  }

  /** My profile sign-out-all -> revokes all auth_sessions rows for the authenticated user. */
  revokeAllSessions(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/sessions`);
  }

  /** Sidebar/session expiry -> revokes current refresh session server-side -> clears local JWT/user signals -> caller navigates to /login. */
  logout(): Observable<void> {
    return this.withCsrf(() => this.http.post<void>(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true })).pipe(
      catchError(() => of(void 0)),
      finalize(() => this.clearAuthentication()),
    );
  }

  /** Uses the HttpOnly refresh cookie -> /auth/refresh -> rotates auth_sessions token -> shares one in-flight refresh across requests. */
  refresh(): Observable<AuthResponse> {
    if (this.refreshInFlight$) return this.refreshInFlight$;

    this.refreshInFlight$ = this.withCsrf(() => this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, {}, { withCredentials: true }))
      .pipe(
        tap((response) => this.applyAuthentication(response)),
        finalize(() => (this.refreshInFlight$ = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    return this.refreshInFlight$;
  }

  /** Application bootstrap or passkey login -> refreshes JWT then GET /auth/me -> users + roles + permissions into currentUser. */
  restoreSession(): Observable<boolean> {
    return this.refresh().pipe(
      switchMap(() => {
        const token = this.accessToken();
        return token
          ? this.http.get<{ user: User }>(`${environment.apiUrl}/auth/me`, {
              headers: { Authorization: `Bearer ${token}` },
            })
          : of(null);
      }),
      tap((response) => {
        if (response) this.currentUser.set(response.user);
      }),
      map(() => true),
      catchError(() => {
        this.clearAuthentication();
        return of(false);
      }),
    );
  }

  /** Read by authInterceptor only; the access token is kept in memory, never localStorage. */
  getAccessToken(): string | null {
    return this.accessToken();
  }

  /** Read by authInterceptor to attach Laravel's CSRF header to state-changing requests. */
  getCsrfToken(): string | null {
    return this.csrfToken;
  }

  /** Explicit CSRF bootstrap used before browser WebAuthn calls that bypass normal HttpClient requests. */
  initializeCsrf(): Observable<void> {
    return this.ensureCsrfToken();
  }

  /** Reads roles loaded by /auth/me; used for Angular navigation/UI only, while Laravel remains the authority. */
  hasRole(role: string): boolean {
    return this.currentUser()?.roles.some((item) => item.name === role) ?? false;
  }

  /** Reads role.permissions from /auth/me; hides unavailable UI while backend middleware enforces the same permission. */
  hasPermission(permission: string): boolean {
    return this.currentUser()?.roles.some((role) => role.permissions?.some((item) => item.name === permission)) ?? false;
  }

  /** Receives login/refresh data and publishes it to the reactive UI and translation layer. */
  private applyAuthentication(response: AuthResponse): void {
    this.accessToken.set(response.access_token);
    if (response.user) {
      this.currentUser.set(response.user);
      this.i18n.setLocale(response.user.locale);
    }
  }

  /** Clears all in-memory identity data after logout or an unrecoverable refresh failure. */
  private clearAuthentication(): void {
    this.accessToken.set(null);
    this.currentUser.set(null);
  }

  /** Serializes CSRF acquisition before a mutating Laravel request. */
  private withCsrf<T>(request: () => Observable<T>): Observable<T> {
    return this.ensureCsrfToken().pipe(switchMap(request));
  }

  /** GET /auth/csrf-cookie once and share it with concurrent forms to avoid duplicate bootstrap calls. */
  private ensureCsrfToken(): Observable<void> {
    if (this.csrfToken) return of(void 0);
    if (this.csrfInFlight$) return this.csrfInFlight$;

    this.csrfInFlight$ = this.http
      .get<{ token: string }>(`${environment.apiUrl}/auth/csrf-cookie`, { withCredentials: true })
      .pipe(
        tap((response) => this.storeCsrfToken(response.token)),
        map(() => void 0),
        finalize(() => (this.csrfInFlight$ = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    return this.csrfInFlight$;
  }

  /** Stores the server token in memory and in a meta tag so the interceptor can send it with later requests. */
  private storeCsrfToken(token: string): void {
    this.csrfToken = token;

    let meta = this.document.head.querySelector<HTMLMetaElement>('meta[name="csrf-token"]');
    if (!meta) {
      meta = this.document.createElement('meta');
      meta.name = 'csrf-token';
      this.document.head.append(meta);
    }

    meta.content = token;
  }
}

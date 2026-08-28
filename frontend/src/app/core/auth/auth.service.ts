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

  register(payload: RegisterRequest): Observable<{ message: string }> {
    return this.withCsrf(() => this.http.post<{ message: string }>(`${environment.apiUrl}/auth/register`, payload, { withCredentials: true }));
  }

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.withCsrf(() => this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload, { withCredentials: true })).pipe(
      tap((response) => this.applyAuthentication(response)),
    );
  }

  forgotPassword(payload: { email: string }): Observable<{ message: string }> {
    return this.withCsrf(() => this.http.post<{ message: string }>(`${environment.apiUrl}/auth/password/forgot`, payload, { withCredentials: true }));
  }

  resetPassword(payload: { token: string; email: string; password: string; password_confirmation: string }): Observable<{ message: string }> {
    return this.withCsrf(() => this.http.post<{ message: string }>(`${environment.apiUrl}/auth/password/reset`, payload, { withCredentials: true }));
  }

  changePassword(payload: { current_password: string; password: string; password_confirmation: string }): Observable<AuthResponse> {
    return this.withCsrf(() => this.http.put<AuthResponse>(`${environment.apiUrl}/profile/password`, payload, { withCredentials: true })).pipe(
      tap((response) => this.applyAuthentication(response)),
    );
  }

  requestEmailChange(payload: { current_password: string; email: string }): Observable<{ message: string }> {
    return this.withCsrf(() => this.http.put<{ message: string }>(`${environment.apiUrl}/profile/email`, payload, { withCredentials: true }));
  }

  updateLocale(locale: AppLocale): Observable<{ user: User }> {
    return this.withCsrf(() => this.http.put<{ user: User }>(`${environment.apiUrl}/profile/locale`, { locale }, { withCredentials: true })).pipe(
      tap((response) => this.currentUser.set(response.user)),
    );
  }

  updateProfile(payload: { first_name: string; last_name: string; username: string; preferences: { email_notifications: boolean } }): Observable<{ user: User }> {
    return this.withCsrf(() => this.http.put<{ user: User }>(`${environment.apiUrl}/profile`, payload, { withCredentials: true })).pipe(tap((response) => this.currentUser.set(response.user)));
  }

  uploadAvatar(file: File): Observable<{ user: User }> {
    const data = new FormData(); data.append('avatar', file);
    return this.withCsrf(() => this.http.post<{ user: User }>(`${environment.apiUrl}/profile/avatar`, data, { withCredentials: true })).pipe(tap((response) => this.currentUser.set(response.user)));
  }

  exportProfile(): Observable<Record<string, unknown>> { return this.http.get<Record<string, unknown>>(`${environment.apiUrl}/profile/export`); }

  deleteProfile(payload: { current_password: string; confirmation: 'DELETE' }): Observable<{ message: string }> {
    return this.withCsrf(() => this.http.delete<{ message: string }>(`${environment.apiUrl}/profile`, { body: payload, withCredentials: true }));
  }

  listPasskeys(): Observable<{ passkeys: PasskeySummary[] }> {
    return this.http.get<{ passkeys: PasskeySummary[] }>(`${environment.apiUrl}/passkeys`);
  }

  revokePasskey(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/passkeys/${id}`);
  }

  listSessions(): Observable<{ sessions: AuthSessionSummary[] }> {
    return this.http.get<{ sessions: AuthSessionSummary[] }>(`${environment.apiUrl}/sessions`);
  }

  revokeSession(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/sessions/${id}`);
  }

  revokeAllSessions(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/sessions`);
  }

  logout(): Observable<void> {
    return this.withCsrf(() => this.http.post<void>(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true })).pipe(
      catchError(() => of(void 0)),
      finalize(() => this.clearAuthentication()),
    );
  }

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

  getAccessToken(): string | null {
    return this.accessToken();
  }

  getCsrfToken(): string | null {
    return this.csrfToken;
  }

  initializeCsrf(): Observable<void> {
    return this.ensureCsrfToken();
  }

  hasRole(role: string): boolean {
    return this.currentUser()?.roles.some((item) => item.name === role) ?? false;
  }

  hasPermission(permission: string): boolean {
    return this.currentUser()?.roles.some((role) => role.permissions?.some((item) => item.name === permission)) ?? false;
  }

  private applyAuthentication(response: AuthResponse): void {
    this.accessToken.set(response.access_token);
    if (response.user) {
      this.currentUser.set(response.user);
      this.i18n.setLocale(response.user.locale);
    }
  }

  private clearAuthentication(): void {
    this.accessToken.set(null);
    this.currentUser.set(null);
  }

  private withCsrf<T>(request: () => Observable<T>): Observable<T> {
    return this.ensureCsrfToken().pipe(switchMap(request));
  }

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

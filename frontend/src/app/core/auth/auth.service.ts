import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, User } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly accessToken = signal<string | null>(null);
  private readonly currentUser = signal<User | null>(null);
  private refreshInFlight$: Observable<AuthResponse> | null = null;

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null && this.accessToken() !== null);

  register(payload: RegisterRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/register`, payload, { withCredentials: true });
  }

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload, { withCredentials: true }).pipe(
      tap((response) => this.applyAuthentication(response)),
    );
  }

  forgotPassword(payload: { email: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/password/forgot`, payload, { withCredentials: true });
  }

  resetPassword(payload: { token: string; email: string; password: string; password_confirmation: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/password/reset`, payload, { withCredentials: true });
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true }).pipe(
      catchError(() => of(void 0)),
      finalize(() => this.clearAuthentication()),
    );
  }

  refresh(): Observable<AuthResponse> {
    if (this.refreshInFlight$) return this.refreshInFlight$;

    this.refreshInFlight$ = this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, {}, { withCredentials: true })
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

  hasRole(role: string): boolean {
    return this.currentUser()?.roles.some((item) => item.name === role) ?? false;
  }

  hasPermission(permission: string): boolean {
    return this.currentUser()?.roles.some((role) => role.permissions?.some((item) => item.name === permission)) ?? false;
  }

  private applyAuthentication(response: AuthResponse): void {
    this.accessToken.set(response.access_token);
    if (response.user) this.currentUser.set(response.user);
  }

  private clearAuthentication(): void {
    this.accessToken.set(null);
    this.currentUser.set(null);
  }
}

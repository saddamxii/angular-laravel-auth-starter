import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';
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
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/register`, payload);
  }

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload, { withCredentials: true }).pipe(
      tap((response) => this.applyAuthentication(response)),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true }).pipe(
      catchError(() => of(void 0)),
      finalize(() => this.clearAuthentication()),
    );
  }

  refresh(): Observable<AuthResponse> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

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
      switchMapToCurrentUser(this.http, this.accessToken),
      tap((user) => this.currentUser.set(user)),
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
    if (response.user) {
      this.currentUser.set(response.user);
    }
  }

  private clearAuthentication(): void {
    this.accessToken.set(null);
    this.currentUser.set(null);
  }
}

function switchMapToCurrentUser(http: HttpClient, accessToken: () => string | null) {
  return (source: Observable<AuthResponse>): Observable<User> =>
    source.pipe(
      map(() => accessToken()),
      switchMap((token) =>
        token
          ? http.get<{ user: User }>(`${environment.apiUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }).pipe(map((response) => response.user))
          : throwError(() => new Error('Access token was not created.')),
      ),
    );
}

import { switchMap } from 'rxjs';

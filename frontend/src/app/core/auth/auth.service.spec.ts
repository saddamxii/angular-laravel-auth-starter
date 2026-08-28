import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('stores the access token after login without persisting it to local storage', () => {
    service.login({ login: 'user@example.test', password: 'StrongPassword!123' }).subscribe();

    const csrfRequest = http.expectOne('/api/auth/csrf-cookie');
    expect(csrfRequest.request.withCredentials).toBe(true);
    csrfRequest.flush({ token: 'csrf-token' });
    expect(document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content')).toBe('csrf-token');

    const request = http.expectOne('/api/auth/login');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('csrf-token');
    request.flush({
      access_token: 'access-token',
      token_type: 'Bearer',
      expires_in: 900,
      user: {
        id: 1,
        first_name: 'Jane',
        last_name: 'Doe',
        username: 'janedoe',
        email: 'user@example.test',
        email_verified_at: new Date().toISOString(),
        is_active: true,
        locale: 'en',
        roles: [{ id: 4, name: 'user', display_name: 'User', permissions: [] }],
      },
    });

    expect(service.getAccessToken()).toBe('access-token');
    expect(service.isAuthenticated()).toBe(true);
    expect(localStorage.getItem('access_token')).toBeNull();
  });
});

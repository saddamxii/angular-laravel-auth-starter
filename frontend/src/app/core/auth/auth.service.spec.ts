import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('stores the access token after login without persisting it to local storage', () => {
    service.login({ email: 'user@example.test', password: 'StrongPassword!123' }).subscribe();

    const request = http.expectOne('/api/auth/login');
    request.flush({
      access_token: 'access-token',
      token_type: 'Bearer',
      expires_in: 900,
      user: {
        id: 1,
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'user@example.test',
        email_verified_at: new Date().toISOString(),
        is_active: true,
        roles: [{ id: 4, name: 'user', display_name: 'User', permissions: [] }],
      },
    });

    expect(service.getAccessToken()).toBe('access-token');
    expect(service.isAuthenticated()).toBe(true);
    expect(localStorage.getItem('access_token')).toBeNull();
  });
});

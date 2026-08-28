import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAppInitializer, provideZonelessChangeDetection, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Passkeys } from '@laravel/passkeys';
import { take } from 'rxjs';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/auth/auth.interceptor';
import { AuthService } from './app/core/auth/auth.service';
import { BrandingService } from './app/core/branding/branding.service';

Passkeys.configure({
  fetch: {
    credentials: 'include',
  },
});

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAppInitializer(() => inject(BrandingService).load()),
    provideAppInitializer(() => inject(AuthService).restoreSession().pipe(take(1))),
  ],
}).catch((error: unknown) => console.error(error));

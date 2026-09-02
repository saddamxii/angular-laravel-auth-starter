import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { TranslationService } from '../i18n/translation.service';

export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

/**
 * API transport flow: adds locale, JWT and CSRF headers; on an expired access JWT it
 * calls AuthService.refresh(), retries the original request once, then logs out if refresh fails.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const i18n = inject(TranslationService);

  if (req.context.get(SKIP_AUTH)) {
    return next(req);
  }

  const token = auth.getAccessToken();
  const csrfToken = auth.getCsrfToken();
  const isApiRequest = req.url.startsWith(`${environment.apiUrl}/`);
  const needsCsrfToken = isApiRequest && !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  const headers: Record<string, string> = {};

  if (isApiRequest) headers['Accept-Language'] = i18n.locale();

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (needsCsrfToken && csrfToken) {
    headers['X-CSRF-TOKEN'] = csrfToken;
  }

  const request = Object.keys(headers).length > 0
    ? req.clone({ setHeaders: headers })
    : req;

  return next(request).pipe(
    catchError((error) => {
      if (error.status !== 401 || req.url.includes('/auth/refresh') || req.url.includes('/auth/login')) {
        return throwError(() => error);
      }

      return auth.refresh().pipe(
        switchMap(() => {
          const refreshedToken = auth.getAccessToken();
          if (!refreshedToken) {
            return throwError(() => error);
          }

          return next(req.clone({ setHeaders: { Authorization: `Bearer ${refreshedToken}` } }));
        }),
        catchError((refreshError) => {
          void auth.logout().subscribe();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};

import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  if (req.context.get(SKIP_AUTH)) {
    return next(req);
  }

  const token = auth.getAccessToken();
  const request = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
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

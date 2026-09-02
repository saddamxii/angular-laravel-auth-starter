import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Route entry: permits a page only after AuthService has restored a users row and JWT; otherwise sends the browser to /login. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
};

/** Route entry for login/register/reset pages: authenticated users are redirected to /dashboard. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};

/** UI navigation guard using roles returned by /auth/me; Laravel RoleMiddleware repeats the check for every API call. */
export const roleGuard = (roles: string[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return roles.some((role) => auth.hasRole(role)) ? true : router.createUrlTree(['/forbidden']);
};

/** UI navigation guard using permissions returned by /auth/me; it routes denied users to /forbidden. */
export const permissionGuard = (permission: string): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.hasPermission(permission) ? true : router.createUrlTree(['/forbidden']);
};

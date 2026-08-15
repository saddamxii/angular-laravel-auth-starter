import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};

export const roleGuard = (roles: string[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return roles.some((role) => auth.hasRole(role)) ? true : router.createUrlTree(['/forbidden']);
};

export const permissionGuard = (permission: string): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.hasPermission(permission) ? true : router.createUrlTree(['/forbidden']);
};

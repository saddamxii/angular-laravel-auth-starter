import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent) },
  { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent) },
  { path: 'forgot-password', canActivate: [guestGuard], loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent) },
  { path: 'reset-password', canActivate: [guestGuard], loadComponent: () => import('./features/auth/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent) },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
  { path: 'profile', pathMatch: 'full', redirectTo: 'settings/profile' },
  { path: 'settings', pathMatch: 'full', redirectTo: 'settings/account' },
  { path: 'settings/profile', canActivate: [authGuard], data: { section: 'profile' }, loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent) },
  { path: 'settings/account', canActivate: [authGuard], data: { section: 'account' }, loadComponent: () => import('./features/security/security.component').then((m) => m.SecurityComponent) },
  { path: 'settings/passkeys', canActivate: [authGuard], data: { section: 'passkeys' }, loadComponent: () => import('./features/security/security.component').then((m) => m.SecurityComponent) },
  { path: 'settings/sessions', pathMatch: 'full', redirectTo: 'settings/profile' },
  { path: 'security', pathMatch: 'full', redirectTo: 'settings/account' },
  { path: 'admin', pathMatch: 'full', redirectTo: 'admin/users' },
  { path: 'admin/users', canActivate: [authGuard, roleGuard(['admin', 'manager'])], data: { section: 'users' }, loadComponent: () => import('./features/admin/admin.component').then((m) => m.AdminComponent) },
  { path: 'admin/roles', canActivate: [authGuard, roleGuard(['admin'])], data: { section: 'roles' }, loadComponent: () => import('./features/admin/admin.component').then((m) => m.AdminComponent) },
  { path: 'admin/audit-logs', canActivate: [authGuard, roleGuard(['admin'])], data: { section: 'audit' }, loadComponent: () => import('./features/admin/admin.component').then((m) => m.AdminComponent) },
  { path: 'forbidden', loadComponent: () => import('./features/forbidden/forbidden.component').then((m) => m.ForbiddenComponent) },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];

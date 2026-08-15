import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent) },
  { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent) },
  { path: 'forgot-password', canActivate: [guestGuard], loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent) },
  { path: 'reset-password', canActivate: [guestGuard], loadComponent: () => import('./features/auth/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent) },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
  { path: 'security', canActivate: [authGuard], loadComponent: () => import('./features/security/security.component').then((m) => m.SecurityComponent) },
  { path: 'admin', canActivate: [authGuard], loadComponent: () => import('./features/admin/admin.component').then((m) => m.AdminComponent) },
  { path: 'forbidden', loadComponent: () => import('./features/forbidden/forbidden.component').then((m) => m.ForbiddenComponent) },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];

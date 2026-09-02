# Flux de données de l'application

Ce document complète les commentaires présents dans les services, composants, routes et contrôleurs. Il décrit le chemin réel des données : interface Angular, API Laravel, tables SQL, puis interface Angular.

## Règle générale

1. Une page Angular appelle `AuthService` ou un endpoint Admin depuis `AdminComponent`.
2. `authInterceptor` ajoute le JWT, la langue et le jeton CSRF quand nécessaire.
3. `backend/routes/api.php` applique les middlewares : session web, langue, JWT, rôle et permission.
4. Le contrôleur Laravel valide puis lit ou modifie les tables SQL via les modèles Eloquent.
5. Les mutations sensibles appellent `AuditLogger`, qui ajoute une ligne dans `audit_logs`.
6. La réponse JSON revient vers un signal Angular ou déclenche une navigation ; jamais vers une table HTML directement.

## Tables principales

| Table | Source des données | Consommateur principal |
|---|---|---|
| `users` | inscription, profil, administration, vérification d’e-mail | session Angular `currentUser`, utilisateurs Admin |
| `roles`, `permissions` | seeder et administration | règles Laravel et interface Admin |
| `role_user`, `permission_role` | création/mise à jour de rôle ou utilisateur | `User::roles`, `Role::permissions` |
| `auth_sessions` | login, refresh, passkey, révocation | My profile / Active sessions |
| `passkeys` | cérémonie WebAuthn Laravel Passkeys | Settings / Passkeys |
| `audit_logs` | `AuditLogger` et middleware de connexion | Administration / Audit logs |
| `password_reset_tokens` | Laravel Password Broker | e-mail et page Reset password |

## Authentification par mot de passe

```text
LoginComponent.submit
  -> AuthService.login
  -> POST /api/auth/login
  -> AuthController.login
  -> users (email ou username), roles, permissions
  -> AuthSessionManager.record -> auth_sessions
  -> JWT access token + cookie refresh_token
  -> AuthService.applyAuthentication
  -> /dashboard
```

Les tentatives de mot de passe invalide sont limitées par identifiant et IP. Une connexion réussie remet ce compteur à zéro. Le middleware `AuthenticationAuditMiddleware` ajoute les événements de connexion dans `audit_logs`.

## Restauration et renouvellement de session

```text
app bootstrap / requête API 401
  -> AuthService.restoreSession ou authInterceptor
  -> POST /api/auth/refresh avec cookie HttpOnly
  -> AuthController.refresh
  -> auth_sessions (token hash, revoked_at, expires_at) + users.auth_version
  -> nouveaux JWT/cookie, puis GET /api/auth/me
  -> users + roles + permissions -> Angular currentUser
```

## Inscription et vérification e-mail

```text
RegisterComponent.submit
  -> POST /api/auth/register
  -> users + role_user(role=user)
  -> LocalizedVerifyEmail
  -> GET route signée /api/auth/email/verify/{id}/{hash}
  -> users.email_verified_at
  -> /login?verified=1
```

## Mot de passe oublié

```text
ForgotPasswordComponent.submit
  -> POST /api/auth/password/forgot
  -> password_reset_tokens + LocalizedResetPassword email
  -> lien vers /api/auth/password/reset/{token}
  -> Angular ResetPasswordComponent.submit
  -> POST /api/auth/password/reset
  -> users.password
  -> /login
```

## Profil, avatar et sessions

```text
ProfileComponent.save -> PUT /api/profile -> users + audit_logs -> AuthService.currentUser
ProfileComponent.uploadAvatar -> POST /api/profile/avatar -> storage/app/public + users.avatar_path -> signed avatar_url
ProfileComponent.loadSessions -> GET /api/sessions -> auth_sessions WHERE user_id=currentUser.id
ProfileComponent.revoke* -> DELETE /api/sessions -> auth_sessions.revoked_at
```

## Compte et passkeys

```text
SecurityComponent.changePassword
  -> PUT /api/profile/password
  -> users.password + users.auth_version + auth_sessions revoked
  -> new current session + audit_logs

SecurityComponent.requestEmailChange
  -> PUT /api/profile/email
  -> users.pending_email + hashed pending token
  -> emails to old/new addresses
  -> signed verification route -> users.email

SecurityComponent.addPasskey
  -> browser WebAuthn -> Laravel Passkeys routes
  -> passkeys row -> GET /api/passkeys -> SecurityComponent.passkeys signal
```

## Administration

```text
AdminComponent.loadUsers -> GET /api/admin/users -> users + roles + permissions
AdminComponent.saveUser -> POST/PUT /api/admin/users -> users + role_user + audit_logs
AdminComponent.loadRoles -> GET /api/admin/roles -> roles + permission_role + permissions
AdminComponent.saveRole -> POST/PUT /api/admin/roles -> roles + permission_role + audit_logs
AdminComponent.savePermission -> POST /api/admin/permissions -> permissions + audit_logs
AdminComponent.loadAuditLogs -> GET /api/admin/audit-logs -> audit_logs + users actor relation
```

Les exports Excel n’écrivent pas dans la base : `ExcelExportService` convertit uniquement les lignes déjà visibles/chargées dans Angular en fichier `.xlsx` téléchargé par le navigateur.

## Sécurité des autorisations

Les gardes Angular masquent les pages inutiles, mais elles ne constituent pas une protection. Les middlewares Laravel `RoleMiddleware`, `PermissionMiddleware` et `EnsureAccessToken` sont la décision finale avant toute lecture ou écriture SQL.


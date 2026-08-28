# Angular Laravel Auth Starter

Production-oriented reusable authentication starter for modern Angular + Laravel applications.

## Stack

- Angular 22
- Node.js 22 LTS-compatible toolchain
- Laravel 13
- PHP 8.5
- MySQL 8.4 LTS
- WebAuthn / Passkeys
- Playwright
- Docker / Docker Compose
- Jenkins

## Architecture

Angular SPA -> Nginx -> Laravel API -> MySQL

Authentication will support password authentication, short-lived access tokens with secure refresh handling, email verification, password reset, role/permission authorization, session management, audit logging, and WebAuthn/Passkeys.

## Roles

- admin
- manager
- editor
- user

## Development status

Phases 1–7 are implemented and validated. The Jenkins pipeline runs backend,
frontend, WebAuthn, dependency-audit, production-image, and Docker smoke-test
stages from a clean environment.

## Local startup and integration check

Copy `.env.example` to `.env`, replace its development credentials for any
shared environment, then start the complete stack:

```powershell
docker compose up --build -d
```

The development Compose configuration runs migrations and seeds a verified
local administrator. The following PowerShell sequence verifies the browser
same-origin proxy, CSRF protection, session cookie, and password login:

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$csrf = (Invoke-RestMethod -WebSession $session -Uri 'http://localhost:4200/api/auth/csrf-cookie').token
$login = Invoke-RestMethod -Method POST -WebSession $session -Uri 'http://localhost:4200/api/auth/login' -Headers @{ 'X-CSRF-TOKEN' = $csrf } -ContentType 'application/json' -Body '{"email":"admin@example.test","password":"Admin@admin.11"}'
$login.user.email
```

It should print `admin@example.test`. Do not use this seeded password outside
local development. Stop the stack with `docker compose down`.

For production, supply persistent `APP_KEY`, `JWT_SECRET`, database passwords,
and `PASSKEYS_USER_HANDLE_SECRET` through your secret manager; set
`APP_ENV=production`, `APP_DEBUG=false`, `SESSION_SECURE_COOKIE=true`, and an
HTTPS `APP_URL` / `WEBAUTHN_ORIGIN`. The backend exits instead of generating
replacement signing keys when those production requirements are absent.

## Passkeys / WebAuthn

Passkeys use the device or browser authenticator (Windows Hello, Touch ID,
Face ID, Android, a security key, or a password manager). The application
never receives biometric data: Laravel stores only the public WebAuthn
credential and its metadata.

Set `WEBAUTHN_RP_ID` to the frontend host name and `WEBAUTHN_ORIGIN` to its
exact origin. Production requires HTTPS; `localhost` is the sole browser
exception for local development. A user must first sign in with a verified,
active account to add a passkey, and can later use it from the login page.

Run the isolated Chromium virtual-authenticator integration check with:

```powershell
docker compose -p auth-starter-passkey-test -f docker-compose.passkey-test.yml up --build --abort-on-container-exit --exit-code-from passkey-test
```

The test registers a passkey, clears the browser session, and signs in using
that passkey through the production Nginx-to-Laravel proxy. It uses an
in-memory virtual authenticator only; no physical authenticator is needed.

## Security principles

- Never commit secrets.
- Never trust frontend authorization.
- Do not store passwords in plaintext.
- Use WebAuthn/Passkeys rather than direct access to biometric hardware.
- Keep access tokens short-lived.
- Use secure cookies and HTTPS in production.

## Testing

Run the backend suite:

```powershell
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-test
```

Run frontend linting, unit tests, and Chromium E2E tests:

```powershell
docker compose -f docker-compose.frontend-test.yml up --build --abort-on-container-exit --exit-code-from frontend-test
```

Run the HTTPS WebAuthn integration test with a virtual authenticator:

```powershell
docker compose -p auth-starter-passkey-test -f docker-compose.passkey-test.yml up --build --abort-on-container-exit --exit-code-from passkey-test
```

Each command removes its test containers when it completes. Use
`docker compose down -v --remove-orphans` if an interrupted local run leaves
resources behind.

## Jenkins

The [Jenkins pipeline guide](docs/ci/jenkins.md) documents the required Docker
agent capabilities and the backend, frontend, WebAuthn, audit, image, and
smoke-test stages executed by `Jenkinsfile`.

## GitHub workflow

The `main` branch should remain protected. Create focused branches using
`feature/`, `bugfix/`, `hotfix/`, or `docs/`, then open a pull request against
`main`. Require the Jenkins CI job before merge and do not commit `.env` files
or production credentials.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution rules,
[SECURITY.md](SECURITY.md) for private vulnerability reporting, and
[CHANGELOG.md](CHANGELOG.md) for release notes.

## Documentation

See `docs/architecture/README.md` for the initial architecture and implementation plan.

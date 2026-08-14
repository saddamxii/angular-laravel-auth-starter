# Architecture

## Goals

This repository is a reusable authentication foundation, not a business application. Authentication, authorization, security, infrastructure, testing, and deployment concerns remain isolated from future business features.

## Planned layers

```text
Browser
  |
  | HTTPS
  v
Nginx / reverse proxy
  |
  +--> Angular 22 SPA
  |
  +--> Laravel 13 API
           |
           +--> Authentication
           +--> Authorization
           +--> WebAuthn / Passkeys
           +--> Sessions / devices
           +--> Audit logging
           |
           v
        MySQL 8.4 LTS
```

## Authorization model

```text
User -> Roles -> Permissions
```

Initial roles: `admin`, `manager`, `editor`, `user`.

The backend is authoritative for authorization. Angular guards only improve navigation and user experience.

## Authentication model

Password authentication will use short-lived access tokens and a secure refresh mechanism. Password reset and email verification will use Laravel's supported workflows.

Passkeys will use WebAuthn. The browser and platform authenticator handle Face ID, Touch ID, fingerprint, Windows Hello, device PIN, or security keys. The server verifies the WebAuthn challenge/assertion and stores public credential metadata only.

## Testing strategy

- Laravel feature/unit tests for API behavior and authorization.
- Angular unit/component tests for client behavior.
- Playwright E2E tests for browser flows.
- WebAuthn virtual authenticators where supported by the test environment.
- Docker Compose integration environment.
- Jenkins as the primary CI/CD pipeline.

## Implementation phases

1. Repository and infrastructure foundation.
2. Laravel API foundation and database schema.
3. Angular application foundation and design system.
4. Authentication and authorization.
5. WebAuthn/Passkeys.
6. Security hardening and audit logging.
7. Automated testing.
8. Docker integration.
9. Jenkins pipeline.
10. Production documentation and GitHub release workflow.

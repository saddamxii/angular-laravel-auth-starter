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

Phase 1: repository and infrastructure foundation.

Authentication and authorization implementation will be added only after the infrastructure foundation is validated.

## Security principles

- Never commit secrets.
- Never trust frontend authorization.
- Do not store passwords in plaintext.
- Use WebAuthn/Passkeys rather than direct access to biometric hardware.
- Keep access tokens short-lived.
- Use secure cookies and HTTPS in production.

## Documentation

See `docs/architecture/README.md` for the initial architecture and implementation plan.

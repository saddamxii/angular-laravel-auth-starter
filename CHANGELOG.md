# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Angular and Laravel authentication starter with role-based authorization.
- JWT access tokens with refresh-session rotation and secure cookie handling.
- Email verification, password reset, audit logging, active sessions, and
  WebAuthn passkeys.
- Docker Compose development, backend, frontend, passkey integration, and
  production smoke-test environments.
- Jenkins pipeline for backend, frontend, passkey, dependency-audit, image-build,
  and smoke-test stages.

### Security

- CSRF protection, authentication rate limits, authorization checks, WebAuthn
  origin validation, and dependency auditing.

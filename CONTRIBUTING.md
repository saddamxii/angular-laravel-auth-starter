# Contributing

Thank you for improving this authentication starter. Keep changes focused,
reviewable, and safe for reuse by downstream applications.

## Workflow

1. Create a branch from `main` using `feature/`, `bugfix/`, `hotfix/`, or
   `docs/`.
2. Use Conventional Commits, for example `feat: add recovery-code support` or
   `fix: reject expired passkey challenges`.
3. Run the relevant checks before opening a pull request:

   ```sh
   docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-test
   docker compose -f docker-compose.frontend-test.yml up --build --abort-on-container-exit --exit-code-from frontend-test
   docker compose -p auth-starter-passkey-test -f docker-compose.passkey-test.yml up --build --abort-on-container-exit --exit-code-from passkey-test
   ```

4. Open a pull request against `main` with a concise description, test evidence,
   and any security or migration impact.

## Pull request requirements

- Keep secrets, credentials, private keys, and `.env` files out of commits.
- Add or update tests for behavioral changes.
- Preserve backward compatibility for API consumers, or document a breaking
  change clearly.
- Do not weaken authentication, authorization, CSRF, rate-limiting, or WebAuthn
  controls just to make a test pass.
- Jenkins must pass before merging.

## Branch protection recommendation

Protect `main` with pull-request reviews, up-to-date branches, and the required
Jenkins CI check. Restrict direct pushes and force pushes to administrators only.

# Security policy

## Supported version

Security fixes are applied to the latest code on the `main` branch. Consumers
should keep their starter-based applications updated and rotate all environment
secrets when deploying a new environment.

## Reporting a vulnerability

Please do not report vulnerabilities in public issues or pull requests.

Use GitHub's private vulnerability reporting feature for this repository. Include
a clear description, affected endpoint or component, reproduction steps, and
potential impact. Do not include passwords, access tokens, refresh cookies,
private keys, or real user data.

Reports are acknowledged as soon as practical. A fix, mitigation, and disclosure
timeline will be coordinated privately with the reporter.

## Deployment responsibility

This starter intentionally ships only example values in `.env.example`.
Before production deployment, set unique `APP_KEY`, `JWT_SECRET`, database
credentials, and passkey-related secrets; enforce HTTPS; and review CORS and
cookie-domain settings for the deployed domain.

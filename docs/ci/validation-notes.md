# CI validation notes

The validation workflow is intentionally executed against the pull request merge ref so the base branch and authentication starter are validated together.

Dependency constraints are pinned to published versions:

- Angular 22.1.x
- Laravel 13.x
- PHP 8.5
- MySQL 8.4.x
- Laravel Passkeys 0.2.x

Do not claim a release is green until GitHub Actions reports successful backend, frontend/E2E, and production-image jobs.

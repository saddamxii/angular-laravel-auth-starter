#!/bin/sh
set -eu

if [ "${APP_ENV:-production}" = "production" ]; then
  if [ -z "${APP_KEY:-}" ]; then
    echo "APP_KEY must be configured in production." >&2
    exit 1
  fi

  if [ -z "${JWT_SECRET:-}" ] || [ "${JWT_SECRET}" = "change-me-development-jwt-secret" ]; then
    echo "JWT_SECRET must be configured in production." >&2
    exit 1
  fi

  if [ "${APP_DEBUG:-false}" = "true" ]; then
    echo "APP_DEBUG must be false in production." >&2
    exit 1
  fi
fi

if [ -z "${APP_KEY:-}" ]; then
  APP_KEY="$(php artisan key:generate --show --no-ansi)"
  export APP_KEY
fi

if [ -z "${JWT_SECRET:-}" ] || [ "${JWT_SECRET}" = "change-me-development-jwt-secret" ]; then
  JWT_SECRET="$(php artisan jwt:secret --show --no-ansi 2>/dev/null || true)"
  if [ -z "${JWT_SECRET}" ]; then
    JWT_SECRET="$(php -r 'echo bin2hex(random_bytes(32));')"
  fi
  export JWT_SECRET
fi

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  php artisan migrate --force
  php artisan db:seed --force
fi

exec "$@"

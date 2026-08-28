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
  attempt=1
  until php -r '
    $dsn = sprintf("mysql:host=%s;port=%s;dbname=%s", getenv("DB_HOST"), getenv("DB_PORT"), getenv("DB_DATABASE"));
    new PDO($dsn, getenv("DB_USERNAME"), getenv("DB_PASSWORD"), [PDO::ATTR_TIMEOUT => 3]);
  ' >/dev/null 2>&1; do
    if [ "$attempt" -ge 30 ]; then
      echo "MySQL did not accept application connections after 60 seconds." >&2
      exit 1
    fi

    echo "Waiting for MySQL application connection (attempt $attempt/30)..."
    attempt=$((attempt + 1))
    sleep 2
  done

  php artisan migrate --force
  php artisan db:seed --force
fi

exec "$@"

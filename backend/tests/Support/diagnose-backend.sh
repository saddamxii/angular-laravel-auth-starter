#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

STEP=0
fail() {
  local code=$?
  echo ""
  echo "[FAIL] Backend diagnostic stopped at step ${STEP}. exit=${code}" >&2
  echo "[FAIL] command: ${BASH_COMMAND}" >&2
  exit "$code"
}
trap fail ERR

step() {
  STEP=$((STEP + 1))
  echo ""
  echo "========== [${STEP}] $* =========="
}

run() {
  echo "+ $*"
  "$@"
}

step "PHP runtime"
run php -v

step "Composer dependencies"
run php -r 'if (!is_file("vendor/autoload.php")) { fwrite(STDERR, "vendor/autoload.php is missing\n"); exit(10); } echo "vendor/autoload.php present\n";'

step "Laravel bootstrap"
run php artisan about --no-interaction

step "Environment diagnostics"
run php artisan env --no-interaction

step "Database connectivity"
run php artisan tinker --execute='DB::connection()->getPdo(); echo "database connection OK\n";'

step "Migration status"
run php artisan migrate:status --no-interaction

step "Migration and seed"
run php artisan migrate:fresh --seed --force --no-interaction

step "Database verification"
run php artisan tinker --execute='echo "users=" . App\\Models\\User::count() . "\n";'

step "PHPUnit discovery"
run vendor/bin/phpunit --list-tests

echo ""
echo "========== DIAGNOSTIC PRECHECK PASSED =========="
echo "All pre-test stages completed successfully."

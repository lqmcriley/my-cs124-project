#!/bin/bash
# Runs every migration on a throwaway local Postgres, then every test in supabase/tests/.
# Needs Homebrew Postgres: brew install postgresql@17
# Usage: npm run test:db
set -euo pipefail

PG=/opt/homebrew/opt/postgresql@17/bin
PORT=54329
DIR="$(mktemp -d)"
export LC_ALL=en_US.UTF-8
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cleanup() { "$PG/pg_ctl" -D "$DIR/data" stop -m fast >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT

"$PG/initdb" -D "$DIR/data" -U postgres -A trust >/dev/null
"$PG/pg_ctl" -D "$DIR/data" -o "-p $PORT -k '' -c listen_addresses=127.0.0.1" -l "$DIR/log.txt" start >/dev/null
sleep 2
psql() { "$PG/psql" -h 127.0.0.1 -p "$PORT" -U postgres -q "$@"; }

psql -c "create database halfsies_test"
psql -d halfsies_test -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/stubs.sql" >/dev/null
for migration in "$ROOT"/supabase/migrations/*.sql; do
  psql -d halfsies_test -v ON_ERROR_STOP=1 -f "$migration" >/dev/null
done
echo "All migrations applied."

# Each test prints "PASS: ..." lines. A failing check stops with "FAIL: ..." and exits.
passed=0
for test in "$ROOT"/supabase/tests/*.test.sql; do
  echo "--- $(basename "$test")"
  output="$(psql -d halfsies_test -t -v ON_ERROR_STOP=1 -f "$test")"
  echo "$output" | grep -E '^ *PASS' | sed 's/^ *//'
  passed=$((passed + $(echo "$output" | grep -cE '^ *PASS')))
done
echo "All $passed database checks passed."


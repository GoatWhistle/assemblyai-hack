#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

GATE="src/gate/decide.ts"
MUTATIONS="scripts/checks/gate-mutations.txt"
BACKUP="$(mktemp -t gate-backup.XXXXXX)"

[ -f "$MUTATIONS" ] || { echo "no $MUTATIONS" >&2; exit 1; }

if [ ! -f "$GATE" ]; then
  if [ "${ALLOW_NO_GATE:-0}" = "1" ]; then
    echo "gate mutation: $GATE absent, skipped by ALLOW_NO_GATE=1"
    exit 0
  fi
  echo "$GATE does not exist" >&2
  echo "the adversarial check cannot pass by absence; set ALLOW_NO_GATE=1 only before the gate exists" >&2
  exit 1
fi

LOCK="$ROOT/.gate-mutation-running"

if [ -e "$LOCK" ]; then
  holder="$(cat "$LOCK" 2>/dev/null || true)"
  if [ -n "$holder" ] && kill -0 "$holder" 2>/dev/null; then
    echo "another gate mutation run (pid $holder) holds $LOCK" >&2
    echo "two runs mutating the same file would restore each other's damage" >&2
    exit 1
  fi
  echo "clearing a stale lock left by pid ${holder:-unknown}, which is no longer running" >&2
  rm -f "$LOCK"
fi

while IFS='|' read -r _label search _replace _expected; do
  [ -n "${search:-}" ] || continue
  if ! grep -qF -- "$search" "$GATE"; then
    echo "the gate is missing the original text of a mutation target:" >&2
    echo "  $search" >&2
    echo "either an earlier run was interrupted and left the gate broken, or the gate was" >&2
    echo "edited without updating $MUTATIONS; this run would back up the damage and report" >&2
    echo "success on it, so it refuses to start" >&2
    exit 1
  fi
done < "$MUTATIONS"

echo "$$" > "$LOCK"

cp "$GATE" "$BACKUP"

restore() {
  cp "$BACKUP" "$GATE"
  rm -f "$BACKUP" "$LOCK"
}
trap restore EXIT INT TERM HUP

EXPECTED="$(grep -c '[^[:space:]]' "$MUTATIONS")"

if [ "$EXPECTED" -lt 1 ]; then
  echo "$MUTATIONS declares no mutations" >&2
  exit 1
fi

failed=0
total=0

while IFS='|' read -r label search replace expected_test; do
  case "$label" in ''|\#*) continue ;; esac
  total=$((total + 1))

  if ! python - "$GATE" "$search" "$replace" <<'PY'
import sys

path, search, replace = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path, encoding="utf-8", newline="") as fh:
    text = fh.read()
count = text.count(search)
if count != 1:
    print(f"mutation target found {count} times, expected 1: {search!r}", file=sys.stderr)
    sys.exit(2)
with open(path, "w", encoding="utf-8", newline="") as fh:
    fh.write(text.replace(search, replace))
PY
  then
    echo "CANNOT APPLY: $label" >&2
    echo "  the mutation text does not match the gate source; the check is lying, not passing" >&2
    failed=1
    cp "$BACKUP" "$GATE"
    continue
  fi

  NO_COLOR=1 FORCE_COLOR=0 npx vitest run --reporter=dot --no-color >/dev/null 2>&1 && status=0 || status=$?

  named=$(NO_COLOR=1 FORCE_COLOR=0 npx vitest run --no-color --reporter=json -t "$expected_test" 2>/dev/null) || true
  verdict=$(printf '%s' "$named" | node "$ROOT/scripts/checks/named-test-verdict.mjs" "$expected_test")

  if [ "$status" -eq 0 ]; then
    echo "MUTATION SURVIVED: $label" >&2
    echo "  the suite passed on deliberately broken code" >&2
    failed=1
  elif [ "$verdict" = "absent" ]; then
    echo "NAMED TEST MISSING: $label" >&2
    echo "  no test titled $expected_test ran, so this branch is guarded by nothing" >&2
    failed=1
  elif [ "$verdict" != "failed" ]; then
    echo "WRONG TEST FAILED: $label" >&2
    echo "  the suite broke but $expected_test itself reported $verdict" >&2
    failed=1
  else
    echo "killed: $label (by $expected_test)"
  fi

  cp "$BACKUP" "$GATE"
done < <(grep -v '^[[:space:]]*$' "$MUTATIONS")

if [ "$total" -ne "$EXPECTED" ]; then
  echo "ran $total mutations but $MUTATIONS declares $EXPECTED" >&2
  echo "a mutation silently skipped would report success on a branch nobody broke" >&2
  exit 1
fi

if ! diff -q "$BACKUP" "$GATE" >/dev/null; then
  echo "gate was not restored byte for byte" >&2
  exit 1
fi

if [ "$failed" -ne 0 ]; then
  echo "" >&2
  echo "a surviving or unapplied mutation is a defect in the check, not proof of the code" >&2
  exit 1
fi

echo "gate mutation: $total/$EXPECTED branches killed by their own test"

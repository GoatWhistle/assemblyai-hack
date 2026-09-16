#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

GATE="src/gate/decide.ts"
MUTATIONS="scripts/gate-mutations.txt"
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

cp "$GATE" "$BACKUP"

restore() {
  cp "$BACKUP" "$GATE"
  rm -f "$BACKUP"
}
trap restore EXIT

failed=0
total=0

while IFS='|' read -r label search replace expected_test; do
  case "$label" in ''|\#*) continue ;; esac
  total=$((total + 1))

  if ! python - "$GATE" "$search" "$replace" <<'PY'
import sys

path, search, replace = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path, encoding="utf-8") as fh:
    text = fh.read()
count = text.count(search)
if count != 1:
    print(f"mutation target found {count} times, expected 1: {search!r}", file=sys.stderr)
    sys.exit(2)
with open(path, "w", encoding="utf-8") as fh:
    fh.write(text.replace(search, replace))
PY
  then
    echo "CANNOT APPLY: $label" >&2
    echo "  the mutation text does not match the gate source; the check is lying, not passing" >&2
    failed=1
    cp "$BACKUP" "$GATE"
    continue
  fi

  output=$(npx vitest run --reporter=dot 2>&1) && status=0 || status=$?

  if [ "$status" -eq 0 ]; then
    echo "MUTATION SURVIVED: $label" >&2
    echo "  the suite passed on deliberately broken code" >&2
    failed=1
  elif ! printf '%s' "$output" | grep -q "$expected_test"; then
    echo "WRONG TEST FAILED: $label" >&2
    echo "  expected $expected_test to fail by name" >&2
    failed=1
  else
    echo "killed: $label (by $expected_test)"
  fi

  cp "$BACKUP" "$GATE"
done < "$MUTATIONS"

if ! diff -q "$BACKUP" "$GATE" >/dev/null; then
  echo "gate was not restored byte for byte" >&2
  exit 1
fi

if [ "$failed" -ne 0 ]; then
  echo "" >&2
  echo "a surviving or unapplied mutation is a defect in the check, not proof of the code" >&2
  exit 1
fi

echo "gate mutation: $total/$total branches killed by their own test"

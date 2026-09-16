#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ALLOWED="src/gate/confirm.ts"
failed=0

casts=$(grep -rn 'as ConfirmedValue' src app tests 2>/dev/null || true)

while IFS= read -r line; do
  [ -n "$line" ] || continue
  file="${line%%:*}"
  if [ "$file" != "$ALLOWED" ]; then
    echo "ConfirmedValue is constructed outside the gate: $line" >&2
    failed=1
  fi
done <<< "$casts"

count=$(printf '%s\n' "$casts" | grep -c "^$ALLOWED:" || true)

if [ ! -f "$ALLOWED" ]; then
  echo "$ALLOWED does not exist; the gate invariant cannot be verified by absence" >&2
  exit 1
fi

if [ "$count" -eq 0 ]; then
  echo "no ConfirmedValue construction found in $ALLOWED" >&2
  echo "either the factory was renamed or the invariant moved; the check must not pass blind" >&2
  exit 1
fi

if [ "$count" -gt 1 ]; then
  echo "$ALLOWED constructs ConfirmedValue $count times, expected exactly 1" >&2
  failed=1
fi

unsafe=$(grep -rn 'as unknown as' src app 2>/dev/null || true)
if [ -n "$unsafe" ]; then
  echo "double assertion found, which can forge any branded type:" >&2
  echo "$unsafe" >&2
  failed=1
fi

if [ "$failed" -ne 0 ]; then
  echo "" >&2
  echo "ConfirmedValue must be constructible only inside gate.confirm()" >&2
  exit 1
fi

echo "gate invariant: ConfirmedValue is constructed once, inside the gate"

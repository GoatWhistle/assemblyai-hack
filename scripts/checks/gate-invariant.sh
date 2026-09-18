#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

ALLOWED="src/gate/confirm.ts"
failed=0

casts=$(grep -rnE 'as ConfirmedValue|<ConfirmedValue>' src app tests 2>/dev/null || true)

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

suppressed=$(grep -rnE '@ts-(expect-error|ignore|nocheck)' src app 2>/dev/null || true)
if [ -n "$suppressed" ]; then
  echo "a type-checker suppression in product code can forge a branded type past tsc:" >&2
  echo "$suppressed" >&2
  failed=1
fi

forged_in_tests=$(grep -rn 'as unknown as ConfirmedValue' tests 2>/dev/null || true)
if [ -n "$forged_in_tests" ]; then
  echo "a test forges a ConfirmedValue, which makes every assertion after it meaningless:" >&2
  echo "$forged_in_tests" >&2
  failed=1
fi

setters=$(grep -rn 'setField(' src app 2>/dev/null | grep -vE '^src/(domain/order|tools/intake)\.ts:' || true)
if [ -n "$setters" ]; then
  echo "Order.setField is called outside the domain and the intake store:" >&2
  echo "$setters" >&2
  echo "a value reaches the order through gate.confirm() and writeConfirmed(), nowhere else" >&2
  failed=1
fi

if ! grep -q 'declare const confirmedBrand: unique symbol' src/domain/order.ts; then
  echo "the ConfirmedValue brand is no longer a module-private unique symbol" >&2
  echo "without the brand every object literal satisfies the type and the gate is decorative" >&2
  exit 1
fi

if grep -qE '^export (declare )?const confirmedBrand' src/domain/order.ts; then
  echo "the brand symbol is exported, so any module can construct a ConfirmedValue" >&2
  exit 1
fi

if [ "$failed" -ne 0 ]; then
  echo "" >&2
  echo "ConfirmedValue must be constructible only inside gate.confirm()" >&2
  exit 1
fi

echo "gate invariant: ConfirmedValue is constructed once, inside the gate"

#!/usr/bin/env bash

set -euo pipefail

SRC_LIMIT=20
TEST_LIMIT=30
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE="$ROOT/docs/baselines/package-size.txt"

cd "$ROOT"

current() {
  {
    git ls-files -- 'src/**' 'app/**'
    git ls-files --others --exclude-standard -- 'src/**' 'app/**'
  } | sort -u \
    | grep -E '\.(ts|tsx)$' \
    | grep -v '\.gen\.' \
    | while IFS= read -r file; do
        printf '%s %s\n' "$(dirname "$file")" "$(basename "$file")"
      done \
    | awk -v s="$SRC_LIMIT" '
        { count[$1]++ }
        END { for (d in count) if (count[d] > s) printf "%s %s\n", count[d], d }
      ' \
    | sort -k2
}

if [ "${1:-}" = "--update" ]; then
  {
    current
  } > "$BASELINE"
  echo "baseline updated: $BASELINE"
  exit 0
fi

if [ ! -f "$BASELINE" ]; then
  echo "no baseline $BASELINE, run: make baseline-package-size" >&2
  exit 1
fi

report=$(current | awk -v s="$SRC_LIMIT" '
  FILENAME != "-" { if ($0 ~ /^#/ || NF == 0) next; base[$2] = $1; next }
  {
    if (!($2 in base)) { printf "new package over %s files: %s (%s)\n", s, $2, $1; next }
    if ($1 > base[$2]) { printf "package has grown: %s (%s -> %s)\n", $2, base[$2], $1 }
  }
' "$BASELINE" -)

if [ -n "$report" ]; then
  echo "$report" >&2
  echo "" >&2
  echo "cut the package by subject" >&2
  exit 1
fi

echo "package size: no excess over the baseline"

#!/usr/bin/env bash

set -euo pipefail

SRC_LIMIT=20
TEST_LIMIT=30
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BASELINE="$ROOT/scripts/baselines/package-size.txt"

cd "$ROOT"

count_tree() {
  local limit="$1"
  shift
  {
    git ls-files -- "$@"
    git ls-files --others --exclude-standard -- "$@"
  } | sort -u \
    | grep -E '\.(ts|tsx)$' \
    | grep -v '\.gen\.' \
    | awk -v s="$limit" '
        {
          slash = $0
          n = 0
          while (match(slash, "/")) {
            n = n + RSTART
            slash = substr(slash, RSTART + 1)
          }
          dir = (n > 1) ? substr($0, 1, n - 1) : "."
          count[dir]++
          seen++
        }
        END {
          if (seen == 0) {
            print "no source file was counted at all" > "/dev/stderr"
            exit 1
          }
          for (d in count) if (count[d] > s) printf "%s %s\n", count[d], d
        }
      ' \
    | sort -k2
}

current() {
  count_tree "$SRC_LIMIT" 'src/**' 'app/**'
  count_tree "$TEST_LIMIT" 'tests/**'
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

report=$(current | awk -v src="$SRC_LIMIT" -v tst="$TEST_LIMIT" '
  FILENAME != "-" { if ($0 ~ /^#/ || NF == 0) next; base[$2] = $1; next }
  {
    limit = ($2 ~ /^tests\//) ? tst : src
    if (!($2 in base)) { printf "new package over %s files: %s (%s)\n", limit, $2, $1; next }
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

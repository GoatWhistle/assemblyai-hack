#!/usr/bin/env bash

set -euo pipefail

LIMIT=250
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE="$ROOT/docs/baselines/file-length.txt"

cd "$ROOT"

tracked_and_new() {
  {
    git ls-files "$@"
    git ls-files --others --exclude-standard "$@"
  } | sort -u
}

current() {
  tracked_and_new -- '*.ts' '*.tsx' '*.css' \
    | grep -v '\.gen\.' \
    | grep -v '^data/' \
    | while IFS= read -r file; do
        [ -f "$file" ] && printf '%s\n' "$file"
      done \
    | xargs -d '\n' -r wc -l -- \
    | awk -v limit="$LIMIT" '
        {
          lines = $1
          $1 = ""
          sub(/^[ \t]+/, "", $0)
          if ($0 == "total") next
          if (lines > limit) printf "%s %s\n", lines, $0
        }
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
  echo "no baseline $BASELINE, run: make baseline-file-length" >&2
  exit 1
fi

report=$(current | awk -v limit="$LIMIT" '
  FILENAME != "-" {
    if ($0 ~ /^#/ || NF == 0) next
    base[$2] = $1
    next
  }
  {
    if (!($2 in base)) {
      printf "new file over the %s-line limit: %s (%s)\n", limit, $2, $1
      next
    }
    if ($1 > base[$2]) {
      printf "file has grown: %s (%s -> %s, limit %s)\n", $2, base[$2], $1, limit
    }
  }
' "$BASELINE" -)

if [ -n "$report" ]; then
  echo "$report" >&2
  echo "" >&2
  echo "250-line limit: split the file or shrink it back to the baseline" >&2
  exit 1
fi

echo "$LIMIT-line limit: no excess over the baseline"

#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BASELINE="$ROOT/scripts/baselines/ascii.txt"

cd "$ROOT"

LIST="$(mktemp)"
trap 'rm -f "$LIST"' EXIT

NON_LATIN='[\x{0400}-\x{052F}\x{0530}-\x{058F}\x{0590}-\x{05FF}\x{0600}-\x{06FF}\x{0700}-\x{074F}\x{0900}-\x{097F}\x{0E00}-\x{0E7F}\x{3040}-\x{30FF}\x{4E00}-\x{9FFF}\x{AC00}-\x{D7AF}]'

if ! printf 'x' | LC_ALL=C.UTF-8 grep -qP 'x' 2>/dev/null; then
  echo "grep -P is unavailable in this locale, so the language check cannot run" >&2
  echo "a check that cannot verify must not report success" >&2
  exit 1
fi

current() {
  {
    git ls-files
    git ls-files --others --exclude-standard
  } | sort -u \
    | grep -vE '^data/' \
    | grep -vE '\.(pdf|png|jpg|jpeg|mp4|zip|parquet|csv|ico|svg|woff2?)$' \
    | while IFS= read -r file; do
        [ -f "$file" ] && printf '%s\n' "$file"
      done > "$LIST"

  if [ ! -s "$LIST" ]; then
    echo "no source file was listed at all, so a pass would prove nothing" >&2
    exit 1
  fi

  set +e
  counted=$(xargs -a "$LIST" -d '\n' -- env LC_ALL=C.UTF-8 grep -cP "$NON_LATIN" 2>/dev/null)
  status=$?
  set -e

  if [ "$status" -gt 1 ] && [ "$status" -ne 123 ]; then
    echo "the language scan itself failed with status $status" >&2
    exit 1
  fi

  scanned=$(printf '%s\n' "$counted" | grep -cE ':[0-9]+$' || true)
  listed=$(grep -c . "$LIST" || true)

  if [ "$scanned" -ne "$listed" ]; then
    echo "the language scan reported $scanned files but $listed were listed" >&2
    echo "a partial scan must not read as a clean one" >&2
    exit 1
  fi

  printf '%s\n' "$counted" \
    | { grep -vE ':0$' || true; } \
    | sed -E 's/^(.*):([0-9]+)$/\2 \1/' \
    | sort -k2
}

if [ "${1:-}" = "--update" ]; then
  current > "$BASELINE"
  echo "baseline updated: $BASELINE"
  exit 0
fi

if [ ! -f "$BASELINE" ]; then
  echo "no baseline $BASELINE, run: make baseline-ascii" >&2
  exit 1
fi

report=$(current | awk '
  FILENAME != "-" {
    if (NF == 0) next
    base[$2] = $1
    next
  }
  {
    if (!($2 in base)) {
      printf "non-Latin text in code: %s (%s lines)\n", $2, $1
      next
    }
    if ($1 > base[$2]) {
      printf "non-Latin text has grown: %s (%s -> %s)\n", $2, base[$2], $1
    }
  }
' "$BASELINE" -)

if [ -n "$report" ]; then
  echo "$report" >&2
  echo "" >&2
  echo "the repository is English only, documentation included" >&2
  exit 1
fi

echo "language: no non-Latin text over the baseline"

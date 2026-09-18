#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

BANNED='^(shared|utils|common|helpers|misc|lib|core)$'

failed=0
seen=0

check_tree() {
  local base="$1" label="$2" allow="$3"
  [ -d "$base" ] || return 0
  while IFS= read -r dir; do
    local name
    name="${dir##*/}"
    seen=$((seen + 1))
    if [ -n "$allow" ] && [ "$name" = "$allow" ]; then
      continue
    fi
    if [[ "$name" =~ $BANNED ]]; then
      echo "$label package named by non-subject: $dir" >&2
      failed=1
    fi
  done < <(find "$base" -mindepth 1 -type d -not -path '*/node_modules/*' -not -path '*/__pycache__/*')
}

check_tree src src shared
check_tree app app ""

if [ "$seen" -eq 0 ]; then
  echo "no package directory was examined, so a pass would prove nothing" >&2
  exit 1
fi

if [ "$failed" -ne 0 ]; then
  echo "" >&2
  echo "cut packages by subject; src/shared is the only allowed exception" >&2
  exit 1
fi

echo "package subject: every package is named by what it holds"

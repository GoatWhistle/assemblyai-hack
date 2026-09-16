#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

HELDOUT="eval/heldout"
SEAL="eval/heldout.sha256"

if [ ! -d "$HELDOUT" ]; then
  echo "$HELDOUT does not exist" >&2
  exit 1
fi

count=$(find "$HELDOUT" -type f ! -name '.gitkeep' | wc -l | tr -d ' ')

digest() {
  find "$HELDOUT" -type f ! -name '.gitkeep' -print0 \
    | sort -z \
    | xargs -0 -r sha256sum \
    | sha256sum \
    | cut -d' ' -f1
}

if [ "${1:-}" = "--seal" ]; then
  if [ "$count" -eq 0 ]; then
    echo "refusing to seal an empty held-out set" >&2
    exit 1
  fi
  digest > "$SEAL"
  echo "held-out sealed: $count files, digest $(cat "$SEAL")"
  exit 0
fi

if [ "$count" -eq 0 ]; then
  echo "held-out seal: not labelled yet, nothing to protect"
  exit 0
fi

if [ ! -f "$SEAL" ]; then
  echo "$HELDOUT holds $count files but $SEAL does not exist" >&2
  echo "a held-out set that was never sealed cannot support a generalisation claim" >&2
  echo "seal it once with: bash scripts/check-heldout-seal.sh --seal" >&2
  exit 1
fi

expected=$(cat "$SEAL")
actual=$(digest)

if [ "$expected" != "$actual" ]; then
  echo "the held-out set changed after it was sealed" >&2
  echo "  sealed:  $expected" >&2
  echo "  current: $actual" >&2
  echo "" >&2
  echo "tuning on the held-out set turns its numbers into training accuracy" >&2
  echo "if the change is deliberate, re-seal explicitly and say so in eval/REPORT.md" >&2
  exit 1
fi

echo "held-out seal: intact, $count files"

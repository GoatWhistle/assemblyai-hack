#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

failed=0

for tree in src app; do
  [ -d "$tree" ] || continue
  if grep -rInE 'ASSEMBLYAI_API_KEY|assemblyai[_-]?api[_-]?key' "$tree"       --exclude-dir=api >&2; then
    echo "the AssemblyAI key belongs to app/api routes only" >&2
    failed=1
  fi
  if grep -rInE 'Authorization:\s*(Bearer\s*)?[A-Za-z0-9]{20,}' "$tree" >&2; then
    echo "hardcoded authorization header" >&2
    failed=1
  fi
done

if [ -d app/api ]; then
  if grep -rInE '"use client"' app/api >&2; then
    echo "a route holding the key must never be a client component" >&2
    failed=1
  fi
fi

if git ls-files --error-unmatch .env.local >/dev/null 2>&1; then
  echo ".env.local must not be tracked" >&2
  failed=1
fi

if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  echo ".env must not be tracked" >&2
  failed=1
fi

[ "$failed" -ne 0 ] && exit 1

echo "secrets: the key stays on the server"

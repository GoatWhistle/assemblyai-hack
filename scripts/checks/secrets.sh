#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

failed=0

key_hits=$(grep -rInE 'ASSEMBLYAI_API_KEY|assemblyai[_-]?api[_-]?key' src app 2>/dev/null || true)

while IFS= read -r line; do
  [ -n "$line" ] || continue
  file="${line%%:*}"
  case "$file" in
    app/api/*) ;;
    *)
      echo "the AssemblyAI key belongs to app/api routes only: $line" >&2
      failed=1
      ;;
  esac
done <<< "$key_hits"

if [ -z "$key_hits" ]; then
  echo "no reference to ASSEMBLYAI_API_KEY found anywhere under app/api" >&2
  echo "either the token routes were removed or the name changed; this check must not pass blind" >&2
  exit 1
fi

for tree in src app; do
  [ -d "$tree" ] || continue
  if grep -rInE 'Authorization:\s*(Bearer\s*)?[A-Za-z0-9]{20,}' "$tree" >&2; then
    echo "hardcoded authorization header" >&2
    failed=1
  fi
done

if grep -rIn 'AGENT_TOOL_SECRET' src app 2>/dev/null | grep -vE '^(src/tools/auth\.ts|app/api/)' >&2; then
  echo "the shared tool secret belongs to src/tools/auth.ts and app/api only" >&2
  failed=1
fi

client_files=$(grep -rIl '"use client"' src app 2>/dev/null || true)
while IFS= read -r file; do
  [ -n "$file" ] || continue
  if grep -InE 'process\.env\.(ASSEMBLYAI_API_KEY|AGENT_TOOL_SECRET|BLOB_READ_WRITE_TOKEN)' "$file" >&2; then
    echo "a client component reads a server-only secret: $file" >&2
    failed=1
  fi
done <<< "$client_files"

if grep -rIn 'NEXT_PUBLIC_[A-Z_]*\(KEY\|SECRET\|TOKEN\)' src app .env.example 2>/dev/null >&2; then
  echo "a secret must never travel under a NEXT_PUBLIC_ name" >&2
  failed=1
fi

if [ -d app/api ]; then
  if grep -rInE '"use client"' app/api >&2; then
    echo "a route holding the key must never be a client component" >&2
    failed=1
  fi
fi

for tracked in .env .env.local .env.production .env.development; do
  if git ls-files --error-unmatch "$tracked" >/dev/null 2>&1; then
    echo "$tracked must not be tracked" >&2
    failed=1
  fi
done

if [ -f .env.example ]; then
  while IFS= read -r line; do
    case "$line" in
      ASSEMBLYAI_API_KEY=?*|AGENT_TOOL_SECRET=?*|BLOB_READ_WRITE_TOKEN=?*)
        echo ".env.example carries a real value: ${line%%=*}" >&2
        failed=1
        ;;
    esac
  done < .env.example
fi

if [ -d .next/static ]; then
  if grep -rIl 'ASSEMBLYAI_API_KEY\|AGENT_TOOL_SECRET\|BLOB_READ_WRITE_TOKEN' .next/static >&2; then
    echo "a server-only secret reached the client bundle" >&2
    failed=1
  fi
  bundled="checked the built client bundle too"
else
  bundled="no build present, so only the sources were checked"
fi

if [ "$failed" -ne 0 ]; then
  exit 1
fi

echo "secrets: the key stays on the server, $bundled"

#!/usr/bin/env bash

set -euo pipefail

BUNDLE="${1:-.next/static}"

if [ ! -d "$BUNDLE" ]; then
  echo "no client bundle at $BUNDLE; run next build first, because a check over nothing proves nothing" >&2
  exit 1
fi

file_count=$(find "$BUNDLE" -type f -name '*.js' | wc -l | tr -d ' ')
if [ "$file_count" = "0" ]; then
  echo "the client bundle at $BUNDLE holds no JavaScript file, so nothing was scanned" >&2
  exit 1
fi

LABELS=()
PATTERNS=()

for marker in ASSEMBLYAI_API_KEY BLOB_READ_WRITE_TOKEN UPSTASH_REDIS_REST_TOKEN KV_REST_API_TOKEN AGENT_TOOL_SECRET "readback:intake:" "readback:budget:" "the agent creation response carried no agent id" "x-readback-tool-secret"; do
  LABELS+=("the marker $marker")
  PATTERNS+=("$marker")
done

for name in ASSEMBLYAI_API_KEY BLOB_READ_WRITE_TOKEN UPSTASH_REDIS_REST_TOKEN KV_REST_API_TOKEN AGENT_TOOL_SECRET; do
  value="${!name:-}"
  if [ "${#value}" -ge 12 ]; then
    LABELS+=("the value of $name")
    PATTERNS+=("$value")
  fi
done

found=0
for index in "${!PATTERNS[@]}"; do
  hits=$(grep -rlF --include='*.js' -- "${PATTERNS[$index]}" "$BUNDLE" || true)
  if [ -n "$hits" ]; then
    echo "the client bundle contains ${LABELS[$index]} in:" >&2
    echo "$hits" >&2
    found=1
  fi
done

if [ "$found" -ne 0 ]; then
  echo "a secret name, a secret value or a server-only module reached the browser bundle" >&2
  exit 1
fi

echo "client bundle: $file_count files scanned, no secret and no server-only marker"

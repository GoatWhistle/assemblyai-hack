#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

[ -d src ] || { echo "tokens: no sources yet"; exit 0; }

offenders=$(
  {
    git ls-files -- 'src/**/*.css' 'src/**/*.ts' 'src/**/*.tsx' 'app/**/*.css' 'app/**/*.tsx'
    git ls-files --others --exclude-standard -- 'src/**/*.css' 'src/**/*.ts' 'src/**/*.tsx' 'app/**/*.css' 'app/**/*.tsx'
  } | sort -u \
    | grep -v '^src/styles/tokens/' \
    | while IFS= read -r file; do
        [ -f "$file" ] || continue
        grep -InE '#[0-9a-fA-F]{3,8}|oklch\(|rgba?\(|hsla?\(' "$file" | sed "s|^|$file:|" || true
      done
)

if [ -n "$offenders" ]; then
  echo "$offenders" >&2
  echo "" >&2
  echo "a literal colour is only allowed in src/styles/tokens/; use a token" >&2
  exit 1
fi

echo "tokens: no literal colour outside the token files"

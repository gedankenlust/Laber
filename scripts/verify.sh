#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
build_dir="$(mktemp -d "${TMPDIR:-/tmp}/laber-verify.XXXXXX")"
deployment_target="${MACOSX_DEPLOYMENT_TARGET:-11.0}"
host_architecture="$(uname -m)"
trap 'rm -rf "$build_dir"' EXIT

case "$host_architecture" in
  arm64|x86_64) ;;
  *)
    echo "Unsupported macOS architecture: $host_architecture" >&2
    exit 1
    ;;
esac

swift_target="$host_architecture-apple-macosx$deployment_target"

cd "$repo_dir"

node --check app.js
bash -n scripts/build-macos.sh
plutil -lint Info.plist
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git diff --check HEAD
fi
swiftc main.swift LaberDatabase.swift \
  -target "$swift_target" \
  -lsqlite3 \
  -framework Cocoa \
  -framework WebKit \
  -framework NaturalLanguage \
  -module-cache-path "$build_dir/module-cache" \
  -o "$build_dir/LaberNative"

swiftc LaberDatabase.swift tests/SQLiteSmokeTest.swift \
  -target "$swift_target" \
  -lsqlite3 \
  -module-cache-path "$build_dir/module-cache" \
  -o "$build_dir/SQLiteSmokeTest"
"$build_dir/SQLiteSmokeTest"

echo "Laber verification passed."

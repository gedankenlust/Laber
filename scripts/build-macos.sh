#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
dist_dir="$repo_dir/dist"
app_dir="$dist_dir/Laber.app"
build_dir="$(mktemp -d "${TMPDIR:-/tmp}/laber-build.XXXXXX")"
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

./scripts/verify.sh

rm -rf "$app_dir"
mkdir -p "$app_dir/Contents/MacOS" "$app_dir/Contents/Resources"

swiftc main.swift LaberDatabase.swift \
  -target "$swift_target" \
  -lsqlite3 \
  -framework Cocoa \
  -framework WebKit \
  -framework NaturalLanguage \
  -module-cache-path "$build_dir/module-cache" \
  -o "$app_dir/Contents/MacOS/LaberNative"

cp Info.plist "$app_dir/Contents/Info.plist"
cp index.html app.js style.css "$app_dir/Contents/Resources/"
cp -R assets fonts "$app_dir/Contents/Resources/"
cp assets/AppIcon.icns "$app_dir/Contents/Resources/AppIcon.icns"

actual_deployment_target="$(otool -l "$app_dir/Contents/MacOS/LaberNative" | awk '$1 == "minos" && target == "" { target = $2 } END { print target }')"
if [[ "$actual_deployment_target" != "$deployment_target" ]]; then
  echo "Unexpected deployment target: $actual_deployment_target (expected $deployment_target)" >&2
  exit 1
fi

codesign --force --deep --sign - "$app_dir"
codesign --verify --deep --strict "$app_dir"

echo "Built $app_dir"

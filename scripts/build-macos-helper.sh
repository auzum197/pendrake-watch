#!/usr/bin/env bash
# Build PendrakeSync.app: the macOS background notification helper. It links the
# Pendrake engine through uniffi and posts UNUserNotificationCenter notifications
# whose clicks open the pendrake:// deep link.
#
# Dev build: links the self-contained cdylib (no need to resolve zingolib's
# native link flags) and ad-hoc signs (UNUserNotificationCenter needs a signed
# bundle). Distribution would switch to the universal staticlib + Developer ID.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CRATES="$ROOT/crates"
SWIFT="$ROOT/platform/macos/PendrakeSync"
GEN="$SWIFT/Generated"
APP="$SWIFT/build/PendrakeSync.app"
DYLIB="$CRATES/target/debug/libpendrake_ffi.dylib"

echo "==> building engine cdylib"
( cd "$CRATES" && PROTOC="$(command -v protoc)" cargo build -p pendrake-ffi )

echo "==> generating swift bindings"
( cd "$CRATES" && cargo run --quiet -p pendrake-ffi --bin uniffi-bindgen -- \
    generate --library "$DYLIB" --language swift --out-dir "$GEN" )
# Swift's clang importer looks for `module.modulemap` on the include path.
cp "$GEN/pendrake_ffiFFI.modulemap" "$GEN/module.modulemap"

echo "==> compiling PendrakeSync.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"

swiftc \
    -parse-as-library \
    -o "$APP/Contents/MacOS/PendrakeSync" \
    -I "$GEN" \
    "$GEN/pendrake_ffi.swift" "$SWIFT"/Sources/*.swift \
    -L "$CRATES/target/debug" -lpendrake_ffi \
    -framework AppKit -framework UserNotifications \
    -Xlinker -rpath -Xlinker "$CRATES/target/debug"

cp "$SWIFT/Info.plist" "$APP/Contents/Info.plist"

echo "==> ad-hoc signing"
codesign --force --sign - "$APP"

echo "built $APP"

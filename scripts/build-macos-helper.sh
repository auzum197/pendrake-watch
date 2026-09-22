#!/usr/bin/env bash
# Build PendrakeSync.app: the macOS background notification helper. It links the
# Pendrake engine through uniffi and posts UNUserNotificationCenter notifications
# whose clicks open the pendrake:// deep link.
#
# Release build: the embedded engine (pendrake-ffi -> pendrake-core -> zingolib)
# is compiled optimized, so the helper syncs as fast as the standalone binary. It
# links the self-contained cdylib (no need to resolve zingolib's native link
# flags) and ad-hoc signs (UNUserNotificationCenter needs a signed bundle).
# Distribution would switch to the universal staticlib + Developer ID.
#
# Set PENDRAKE_HELPER_PROFILE=debug for a faster, unoptimized build while
# iterating on the Swift side.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CRATES="$ROOT/crates"
SWIFT="$ROOT/platform/macos/PendrakeSync"
GEN="$SWIFT/Generated"
FFI_SWIFT="$SWIFT/Sources/PendrakeFFI"
FFI_C="$SWIFT/Sources/pendrake_ffiFFI"
APP="$SWIFT/build/PendrakeSync.app"

PROFILE="${PENDRAKE_HELPER_PROFILE:-release}"
if [ "$PROFILE" = "release" ]; then
    CARGO_PROFILE_FLAG="--release"
else
    CARGO_PROFILE_FLAG=""
fi
TARGET_DIR="$CRATES/target/$PROFILE"
DYLIB="$TARGET_DIR/libpendrake_ffi.dylib"

echo "==> building engine cdylib ($PROFILE)"
( cd "$CRATES" && PROTOC="$(command -v protoc)" cargo build $CARGO_PROFILE_FLAG -p pendrake-ffi )

echo "==> generating swift bindings"
( cd "$CRATES" && cargo run --quiet $CARGO_PROFILE_FLAG -p pendrake-ffi --bin uniffi-bindgen -- \
    generate --library "$DYLIB" --language swift --out-dir "$GEN" )

install_if_changed() {
    cmp -s "$1" "$2" 2>/dev/null || cp "$1" "$2"
}
mkdir -p "$FFI_SWIFT" "$FFI_C"
install_if_changed "$GEN/pendrake_ffi.swift" "$FFI_SWIFT/pendrake_ffi.swift"
install_if_changed "$GEN/pendrake_ffiFFI.h" "$FFI_C/pendrake_ffiFFI.h"
install_if_changed "$GEN/pendrake_ffiFFI.modulemap" "$FFI_C/module.modulemap"

echo "==> compiling PendrakeSync ($PROFILE)"
export PENDRAKE_HELPER_PROFILE="$PROFILE"
( cd "$SWIFT" && swift build -c "$PROFILE" --product PendrakeSync )
BIN="$(cd "$SWIFT" && swift build -c "$PROFILE" --show-bin-path)/PendrakeSync"

echo "==> bundling PendrakeSync.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
cp "$BIN" "$APP/Contents/MacOS/PendrakeSync"
cp "$SWIFT/Info.plist" "$APP/Contents/Info.plist"

echo "==> ad-hoc signing"
codesign --force --sign - "$APP"

echo "built $APP"

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
APP="$SWIFT/build/PendrakeSync.app"

PROFILE="${PENDRAKE_HELPER_PROFILE:-release}"
if [ "$PROFILE" = "release" ]; then
    CARGO_PROFILE_FLAG="--release"
    SWIFT_OPT="-O"
else
    CARGO_PROFILE_FLAG=""
    SWIFT_OPT=""
fi
TARGET_DIR="$CRATES/target/$PROFILE"
DYLIB="$TARGET_DIR/libpendrake_ffi.dylib"

echo "==> building engine cdylib ($PROFILE)"
( cd "$CRATES" && PROTOC="$(command -v protoc)" cargo build $CARGO_PROFILE_FLAG -p pendrake-ffi )

echo "==> generating swift bindings"
( cd "$CRATES" && cargo run --quiet $CARGO_PROFILE_FLAG -p pendrake-ffi --bin uniffi-bindgen -- \
    generate --library "$DYLIB" --language swift --out-dir "$GEN" )
# Swift's clang importer looks for `module.modulemap` on the include path.
cp "$GEN/pendrake_ffiFFI.modulemap" "$GEN/module.modulemap"

echo "==> compiling PendrakeSync.app ($PROFILE)"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"

swiftc $SWIFT_OPT \
    -parse-as-library \
    -o "$APP/Contents/MacOS/PendrakeSync" \
    -I "$GEN" \
    "$GEN/pendrake_ffi.swift" "$SWIFT"/Sources/*.swift \
    -L "$TARGET_DIR" -lpendrake_ffi \
    -framework AppKit -framework UserNotifications \
    -Xlinker -rpath -Xlinker "$TARGET_DIR"

cp "$SWIFT/Info.plist" "$APP/Contents/Info.plist"

echo "==> ad-hoc signing"
codesign --force --sign - "$APP"

echo "built $APP"

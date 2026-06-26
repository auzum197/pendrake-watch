set shell := ["bash", "-cu"]

# Build the macOS notification helper. `just macos helper debug` for a quick Swift-only build.
helper profile="release":
    PENDRAKE_HELPER_PROFILE={{profile}} scripts/build-macos-helper.sh

# `bundle` lives in the root justfile, out of this module's scope, so it runs as
# a `just` call in the body rather than as a dependency.

# Build helper and bundle, then open the production apps so a notification click opens the tx screen.
run: helper stop
    -rm -rf src-tauri/target/debug/bundle
    just bundle
    open platform/macos/PendrakeSync/build/PendrakeSync.app
    open src-tauri/target/release/bundle/macos/pendrake-watch.app

# Stop any background daemons and a surviving GUI. The GUI holds a
# single-instance lock, so a leftover process from a previous session would make
# `open` refocus stale code (talking to the daemon we just killed) instead of
# launching the fresh build.
stop:
    -pkill -x pendrake-watch
    -pkill -x pendraked
    -pkill -f PendrakeSync.app

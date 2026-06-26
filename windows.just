set shell := ["bash", "-cu"]
set windows-shell := ["C:/Program Files/Git/bin/bash.exe", "-cu"]

# `build-release` lives in the root justfile, out of this module's scope, so it
# runs as a `just` call in the body rather than as a dependency. `stop` runs
# first because building over a live instance fails with an access-denied panic
# on Windows: the daemon locks the binary the build recopies as a sidecar.

# Build everything in release and run the production GUI over the local socket.
run: stop
    just build-release
    PENDRAKED_BIN="{{justfile_directory()}}/crates/target/release/pendraked.exe" ./src-tauri/target/release/pendrake-watch.exe

# Stop any background daemons.
stop:
    -taskkill //IM pendraked.exe //F
    -taskkill //IM pendrake-watch.exe //F

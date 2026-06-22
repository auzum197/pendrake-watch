set shell := ["bash", "-cu"]

# `build-release` lives in the root justfile, out of this module's scope, so it
# runs as a `just` call in the body rather than as a dependency. `stop` runs
# first so a live daemon never locks a binary the build recopies as a sidecar.

# Build everything in release and run the production GUI over the local socket.
run: stop
    just build-release
    PENDRAKED_BIN="{{justfile_directory()}}/crates/target/release/pendraked" ./src-tauri/target/release/pendrake-watch

# Stop any background daemons.
stop:
    -pkill -x pendraked
    -pkill -f PendrakeSync.app

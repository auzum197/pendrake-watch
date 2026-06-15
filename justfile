# Pendrake Watch-only developer tasks. Run `just` to list them.
# Needs `just` (brew install just) and the prerequisites in the README.

set shell := ["bash", "-cu"]

# List the available tasks.
default:
    @just --list

# Install the JS dependencies.
install:
    pnpm install

# Build the pendraked daemon (release) so the GUI can spawn it.
daemon:
    cd crates && cargo build --release -p pendrake-daemon

# Run the app with hot reload, pinned to the freshly-built pendraked engine.
dev: daemon
    PENDRAKED_BIN="{{justfile_directory()}}/crates/target/release/pendraked" pnpm tauri dev

# Build the macOS notification helper. `just helper debug` for a quick Swift-only build.
[macos]
helper profile="release":
    PENDRAKE_HELPER_PROFILE={{profile}} scripts/build-macos-helper.sh

# Build the GUI as a .app bundle (skips the DMG).
bundle:
    pnpm tauri build --bundles app

# macOS: run the production-style build where a notification click opens the tx screen.
[macos]
run-prod: helper bundle stop
    -rm -rf src-tauri/target/debug/bundle
    open platform/macos/PendrakeSync/build/PendrakeSync.app
    open src-tauri/target/release/bundle/macos/pendrake-watch.app

# Build both Rust workspaces and the production GUI in release.
build-release:
    cd crates && cargo build --release
    pnpm tauri build --no-bundle

# Build everything in release and run the production GUI on Linux and Windows. It
# embeds the production frontend and spawns the release pendraked over the local
# socket. macOS uses run-prod, which also builds the Swift notification helper.
[linux]
run-release: build-release stop
    ./src-tauri/target/release/pendrake-watch

[windows]
run-release: build-release stop
    ./src-tauri/target/release/pendrake-watch.exe

# Stop any background daemons.
[unix]
stop:
    -pkill -x pendraked
    -pkill -f PendrakeSync.app

[windows]
stop:
    -taskkill //IM pendraked.exe //F

# Typecheck the frontend and build the Rust workspaces.
check:
    npx tsc --noEmit
    cd crates && cargo build
    cd src-tauri && cargo build

# Format the Rust code.
fmt:
    cd crates && cargo fmt
    cd src-tauri && cargo fmt

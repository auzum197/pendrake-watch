# Pendrake Watch-only developer tasks. Run `just` to list them.
# Needs `just` (brew install just) and the prerequisites in the README.
#
# Cross-platform tasks live here, grouped for `just --list`. Platform-specific
# tasks live in macos.just / linux.just / windows.just, reached as `just macos
# run`, `just linux run`, `just windows stop`, and so on. All three modules load
# on every host on purpose, so you can invoke another OS's task from this one,
# even though it won't do anything useful there. just modules have isolated
# scope and can't name a root recipe as a dependency, so where a platform task
# needs one (bundle, build-release) it calls `just <recipe>` in its body.

set shell := ["bash", "-cu"]
# On Windows, plain `bash` resolves to the WSL launcher (System32), which has no
# distro and fails. Pin recipes to Git Bash instead.
set windows-shell := ["C:/Program Files/Git/bin/bash.exe", "-cu"]

mod macos
mod linux
mod windows

# List the available tasks, including the per-platform ones.
default:
    @just --list --list-submodules

# Install the JS dependencies.
[group('setup')]
install:
    pnpm install

# Build the pendraked daemon (release) so the GUI can spawn it.
[group('build')]
daemon:
    cd crates && cargo build --release -p pendrake-daemon

# Stage the pendraked daemon as the Tauri sidecar (binaries/pendraked-<triple>), so
# externalBin can ship it inside the bundle and the GUI finds it once installed.
[group('build')]
stage-daemon: daemon
    mkdir -p src-tauri/binaries
    TRIPLE=$(rustc -vV | sed -n 's/host: //p'); EXT=""; case "$TRIPLE" in *windows*) EXT=".exe";; esac; cp "crates/target/release/pendraked$EXT" "src-tauri/binaries/pendraked-$TRIPLE$EXT"

# Build the GUI as a .app bundle (skips the DMG). Stages the daemon first so the
# externalBin sidecar resolves during the build.
[group('build')]
bundle: stage-daemon
    pnpm tauri build --bundles app

# Build both Rust workspaces and the production GUI in release.
[group('build')]
build-release: stage-daemon
    cd crates && cargo build --release
    pnpm tauri build --no-bundle

# Build release and bundle installable packages. On Linux this produces the
# .deb, .rpm, and .AppImage under src-tauri/target/release/bundle.
[group('build')]
package: stage-daemon
    cd crates && cargo build --release
    pnpm tauri build

# Run the app with hot reload, pinned to the freshly-built pendraked engine.
[group('run')]
dev: daemon
    PENDRAKED_BIN="{{justfile_directory()}}/crates/target/release/pendraked" pnpm tauri dev

# Typecheck the frontend and build the Rust workspaces.
[group('qa')]
check:
    npx tsc --noEmit
    cd crates && cargo build
    cd src-tauri && cargo build

# Format the Rust code.
[group('qa')]
fmt:
    cd crates && cargo fmt
    cd src-tauri && cargo fmt

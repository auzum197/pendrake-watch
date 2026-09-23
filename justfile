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

# The release workflow uses this for both macOS architectures, and
# `pnpm tauri build --target <triple>` finds the result. A cross build needs
# `rustup target add <triple>` first. Extra arguments go to cargo (`--locked` in CI).
# Build the daemon for a target triple and stage it as that triple's sidecar.
[group('build')]
stage-daemon-target triple *cargo_args:
    cd crates && cargo build --release -p pendrake-daemon --target {{triple}} {{cargo_args}}
    mkdir -p src-tauri/binaries
    EXT=""; case "{{triple}}" in *windows*) EXT=".exe";; esac; cp "crates/target/{{triple}}/release/pendraked$EXT" "src-tauri/binaries/pendraked-{{triple}}$EXT"

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

# Regenerate the GUI's wire types (src/lib/generated/wire.ts) from pendrake-ipc.
# Run after changing any type the daemon serializes.
[group('build')]
bindings:
    cd crates && cargo test -p pendrake-ipc --features bindings

# Typecheck the frontend against fresh bindings and build the Rust workspaces.
[group('qa')]
check: bindings
    npx tsc --noEmit
    cd crates && cargo build
    cd src-tauri && cargo build

# Format the Rust code.
[group('qa')]
fmt:
    cd crates && cargo fmt
    cd src-tauri && cargo fmt

# Print the app version, failing if any of its six declarations disagree.
[group('release')]
version:
    node scripts/version.mjs check

# Refreshes both lockfiles without a build and checks every declaration agrees
# before committing. Tagging is a separate step, see the README's release section.
# Set the version everywhere it is declared and commit the bump.
[group('release')]
bump version:
    node scripts/version.mjs set {{version}}
    cd crates && cargo update --workspace --offline
    cd src-tauri && cargo update --workspace --offline
    node scripts/version.mjs check {{version}}
    git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock crates/Cargo.toml crates/Cargo.lock platform/macos/PendrakeSync/Info.plist packaging/arch/PKGBUILD
    git commit -m "chore: bump version to {{version}}"

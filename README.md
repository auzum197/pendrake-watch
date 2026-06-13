# Pendrake Watch-only

Pendrake Watch-only is a watch-only Zcash wallet. A background process built on
zingolib owns the wallet file and syncs continuously, posting desktop
notifications while the window is closed. The GUI is a Tauri v2 client that talks
to that process over a local socket. [SPEC.md](SPEC.md) has the full design.

## Architecture

The engine is the `pendrake-core` crate. It builds a watch-only wallet from a
viewing key, runs the sync loop, owns the wallet file, and serves the IPC
protocol. It never runs on its own. One of two hosts compiles it in and gives it
a process to live in:

- `pendraked`, the `pendrake-daemon` crate, is the standalone daemon binary. It is
  the production background process on Linux and Windows, and the dev or headless
  host on macOS.
- `PendrakeSync.app` is a small Swift app that embeds the same engine through
  `pendrake-ffi`, a uniffi static library. It exists only on macOS, where
  clickable notifications need `UNUserNotificationCenter` and a real app bundle.

The GUI (`src-tauri` plus the React app under `src`) is a thin client. On launch
it probes the daemon's Unix socket and spawns a host if nothing answers. Closing
the window leaves the background process running.

| Host | Platforms | Notifications | Rebuild after an engine change |
| --- | --- | --- | --- |
| `pendraked` | Linux, Windows, macOS dev | a click opens the `pendrake://` deep link on Linux and Windows | `cargo build -p pendrake-daemon` |
| `PendrakeSync.app` | macOS | clickable, opens the `pendrake://` deep link | `scripts/build-macos-helper.sh` |

So `pendrake-daemon` is not obsolete now that macOS prefers the app. It remains the
production daemon on Linux and Windows, and the fast host for engine work on macOS.

## Prerequisites

- Rust, pinned by `rust-toolchain.toml`.
- Node and `pnpm`, at the version pinned in `package.json`.
- `protoc`, which zingolib needs to build the lightwalletd gRPC stubs.
- The Tauri v2 platform prerequisites (see the Tauri docs). On Linux that is the
  webkit2gtk stack. On Windows it is WebView2 and the MSVC build tools.

The committed `crates/Cargo.lock` is required. A yanked transitive dependency only
resolves through it, so leave it in place.

## Running it

From the repo root:

```
pnpm install
( cd crates && cargo build --release -p pendrake-daemon )   # so the GUI can spawn a daemon
pnpm tauri dev
```

`pnpm tauri dev` builds and launches the GUI, which spawns the daemon it finds
under `crates/target/release` or `crates/target/debug`. Build release: the daemon
does the heavy scanning, and a debug build syncs much slower.

## macOS

There are two daemon options in dev, with a trade-off between them.

For fast iteration on the engine, the `pendraked` binary is enough. Its
notifications appear, but clicking them does nothing, because a loose binary cannot
drive `UNUserNotificationCenter`.

For clickable notifications that open the transaction screen, build the Swift
helper:

```
scripts/build-macos-helper.sh
```

It compiles the embedded engine in release and bundles `PendrakeSync.app`. Set
`PENDRAKE_HELPER_PROFILE=debug` for a faster build while working on the Swift side.
The GUI prefers a built `PendrakeSync.app` over the binary and logs which one it
spawned. The app carries a frozen copy of the engine, so rerun the script after
any `pendrake-core` change. A missing feature or wrong notification data is usually
a stale app.

## Linux

Install Tauri's Linux prerequisites and `protoc`, then:

```
( cd crates && cargo build --release -p pendrake-daemon )
pnpm tauri dev
```

The GUI spawns `pendraked`, which posts notifications through the session's
notification service. Clicking a notification opens the `pendrake://` deep link
through the desktop's URL handler, which the running GUI is registered for.

## Windows

Install WebView2, the MSVC build tools, and `protoc`, then run the same two
commands as Linux. The GUI spawns `pendraked` the same way, and clicking a
notification opens the deep link too. Reliable toast activation in production also
needs the installer's AppUserModelID shortcut, described in [SPEC.md](SPEC.md).

## Environment variables

- `PENDRAKE_DATA_DIR` overrides the directory that holds the wallet, socket, and
  lock. The GUI and the daemon both read it, so they must agree.
- `PENDRAKED_BIN` is an explicit path to the `pendraked` binary the GUI should
  spawn.
- `PENDRAKE_SYNC_APP` is an explicit path to `PendrakeSync.app` on macOS, checked
  before the discovered build.

## Repository

`crates/` holds the Rust workspace (`pendrake-core`, `pendrake-ipc`,
`pendrake-daemon`, `pendrake-ffi`). `src/` and `src-tauri/` hold the GUI.
`platform/macos/` holds the Swift helper, and `scripts/` holds its build script.
Contributor conventions live in [AGENTS.md](AGENTS.md).

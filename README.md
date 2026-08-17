# Pendrake Watch

A watch-only Zcash wallet that syncs continuously in the background, posts desktop notifications for transactions, and locks behind a passphrase. Supports both mainnet and regtest.

Pendrake does not need to be executing in the foreground. It comes with a background service that syncs and sends notifications.

## Showcase

[![Pendrake Watch demo](https://img.youtube.com/vi/Hk5awvFrZuI/hqdefault.jpg)](https://www.youtube.com/watch?v=Hk5awvFrZuI)

## For Users

Install from the [releases](https://github.com/zcash/pendrake-watch/releases). On first run, paste your UFVK. The app locks behind a passphrase and syncs in the background.

### macOS Security Warning

The DMG is currently unsigned and unnotarized. When you first run it, macOS will show a security warning saying the app is from an unidentified developer. To allow it:

1. Try to open the app normally (it will be blocked)
2. Go to **System Settings → Privacy & Security → Security**
3. Scroll down to the blocked app and click **Allow anyway**
4. Try opening again and click **Open**

Notarization is [in progress](#todo) and will be added to future releases.

## For Developers

### Prerequisites

- Rust, pinned by `rust-toolchain.toml`
- Node and `pnpm` at the version in `package.json`
- [`just`](https://github.com/casey/just), the task runner
- `protoc` for zingolib's gRPC stubs
- Tauri v2 platform prerequisites: webkit2gtk on Linux, WebView2 on Windows, Xcode on macOS

The `crates/Cargo.lock` is committed and required (a yanked transitive dependency only resolves through it).

### Building

Install dependencies and start dev:

```bash
just install
just stage-daemon && just dev
```

`just dev` builds the release daemon and runs the GUI with hot reload. The daemon is built release because it does the heavy scanning.

For production, build and bundle:

```bash
just macos helper     # macOS only: build the Swift notification helper
just package          # Build release and create installers
```

The full list of tasks:

```bash
just dev              # GUI with hot reload
just check            # Typecheck frontend, build Rust
just fmt              # Format Rust code
just daemon           # Build pendraked only
just package          # Build release and bundle installers
just macos run        # macOS: build helper and run both apps
just macos helper     # macOS: rebuild the Swift helper after engine changes
just stop             # Stop background daemons (platform-specific)
```

Run `just` to list all tasks including platform-specific ones.

### Repository Layout

- `crates/` — Rust workspace (pendrake-core, pendrake-ipc, pendrake-daemon, pendrake-ffi)
- `src/` and `src-tauri/` — Tauri GUI
- `platform/macos/` — Swift helper app
- `scripts/` — Build scripts
- [AGENTS.md](AGENTS.md) — Contributor conventions

### Architecture

`pendrake-core` owns the wallet file and runs the sync loop. Two hosts embed it:

- `pendraked` (Linux, Windows, macOS dev) — the standalone daemon binary
- `PendrakeSync.app` (macOS) — a Swift app embedding the daemon through uniffi, needed for clickable notifications

### macOS Dev Notes

`pendraked` notifies but clicking does nothing, because a loose binary cannot drive `UNUserNotificationCenter`. For clickable notifications during dev, build the Swift helper with `just macos helper` (or `just macos helper debug` for a faster Swift-only rebuild). The helper is a frozen copy of the engine, so rebuild it after any pendrake-core changes.

Notifications only open the transaction screen when the registered app bundle is running (the installed app or `just macos run`). Under `just dev` a click focuses the window but does not navigate.

### Environment

- `PENDRAKE_DATA_DIR` — directory for wallet, socket, and lock (both GUI and daemon read it)
- `PENDRAKED_BIN` — explicit path to the pendraked binary
- `PENDRAKE_SYNC_APP` — explicit path to PendrakeSync.app on macOS

### Tests and Checks

```bash
cd crates && cargo test
pnpm test
just check
```


## TODO

- **macOS notarization** — CI workflow is configured but needs to be verified working end-to-end. Once successful, users won't see security warnings when opening the DMG.

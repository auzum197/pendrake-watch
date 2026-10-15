# Pendrake Watch

A watch-only Zcash wallet that syncs continuously in the background, posts desktop notifications for transactions, and locks behind a passphrase. Supports both mainnet and regtest.

Pendrake does not need to be executing in the foreground. It comes with a background service that syncs and sends notifications.

## Showcase

[![Pendrake Watch demo](https://img.youtube.com/vi/Hk5awvFrZuI/hqdefault.jpg)](https://www.youtube.com/watch?v=Hk5awvFrZuI)

## For Users

Install from the [releases](https://github.com/auzum197/pendrake-watch/releases). On first run, paste your UFVK. The app locks behind a passphrase and syncs in the background.

Each release carries a DMG for Apple Silicon and one for Intel Macs, both signed with a Developer ID and notarized, a `.deb`, `.rpm`, `.AppImage` and Arch package for Linux, and an `.msi` and NSIS `.exe` for Windows. The Windows installers are not signed yet, so SmartScreen asks for confirmation on first launch.

### Verifying a download

Every release attaches a `SHA256SUMS` file listing the digest of each installer. Download it next to the installer and check it:

```bash
shasum -a 256 --check --ignore-missing SHA256SUMS      # macOS
sha256sum --check --ignore-missing SHA256SUMS          # Linux
```

On Windows, compare the output of `Get-FileHash .\Pendrake-Watch-<version>-x64.msi` in PowerShell with the matching line in the file.

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
just stage-daemon-target <triple>   # Build and stage the daemon for a cross target
just version          # Print the version, fail if the six declarations disagree
just bump <version>   # Set the version everywhere and commit
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

### JSON-RPC

The daemon speaks JSON-RPC 2.0 over newline-delimited JSON (`docs/adr/0014`). The GUI is one client of it. The local socket (`daemon.sock` in the data dir, a named pipe on Windows) is always on. Set `PENDRAKE_RPC_LISTEN=127.0.0.1:<port>` to also listen on loopback TCP. A TCP connection must first call `authenticate` with the contents of `rpc.cookie` from the data dir, which the daemon writes owner-only at startup and removes on exit. Every connection then starts locked and needs `unlock` with the Passphrase, unless `PENDRAKE_RPC_COOKIE_UNLOCKS=1` is set, in which case a cookie-authenticated connection starts unlocked whenever the Passphrase is already held.

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"authenticate","params":{"cookie":"'"$(cat "$PENDRAKE_DATA_DIR/rpc.cookie")"'"}}' \
  '{"jsonrpc":"2.0","id":2,"method":"unlock","params":{"passphrase":"..."}}' \
  '{"jsonrpc":"2.0","id":3,"method":"subscribeEvents"}' | nc 127.0.0.1 <port>
```

`pendraked watch` is the debugging client for that stream. It connects over the socket, or over TCP with `--tcp 127.0.0.1:<port>` (reading the cookie from the data dir), optionally prompts for the Passphrase with `--unlock`, subscribes, and prints one line per pushed event with a UTC timestamp until stopped. Connection lifecycle lines go to stderr. `--json` prints the raw JSON-RPC lines instead, for `jq` or `tee`. A locked session receives only `event.error`, and the watcher says so. On the daemon side, `RUST_LOG=pendrake_core::ipc=debug` logs every request's method and outcome, with no parameters, so the passphrase and cookie never reach the log.

After `subscribeEvents` the daemon pushes notifications on the same connection, `event.transaction`, `event.progress`, `event.finished`, `event.error`, `event.batchDone` and `event.priceUpdate`, each carrying the event's fields as `params`. Every wallet read names its Wallet by Fingerprint (`{"id": "..."}`), taken from `listWallets`; the daemon keeps no current wallet (`docs/adr/0015`). The method list is the `Call` enum in `crates/pendrake-ipc`, and `pendraked call <method> [json]` sends one request over the socket for debugging.

### macOS Dev Notes

`pendraked` notifies but clicking does nothing, because a loose binary cannot drive `UNUserNotificationCenter`. For clickable notifications during dev, build the Swift helper with `just macos helper` (or `just macos helper debug` for a faster Swift-only rebuild). The helper is a frozen copy of the engine, so rebuild it after any pendrake-core changes.

Notifications only open the transaction screen when the registered app bundle is running (the installed app or `just macos run`). Under `just dev` a click focuses the window but does not navigate.

### Environment

- `PENDRAKE_DATA_DIR` — directory for wallet, socket, and lock (both GUI and daemon read it)
- `PENDRAKE_RPC_LISTEN` — loopback `host:port` for the JSON-RPC TCP listener (daemon only, off when unset)
- `PENDRAKE_RPC_COOKIE_UNLOCKS` — `1` lets a cookie-authenticated TCP connection start unlocked while the Passphrase is held
- `PENDRAKED_BIN` — explicit path to the pendraked binary
- `RUST_LOG=pendrake_core::ipc=debug` — log each request's method and outcome on the daemon
- `PENDRAKE_SYNC_APP` — explicit path to PendrakeSync.app on macOS

### Tests and Checks

```bash
cd crates && cargo test
pnpm test
just check
```

### Releases

A release is a `vX.Y.Z` tag. Pushing one runs `.github/workflows/release.yml`, which builds every installer, signs and notarizes the macOS ones, and publishes a single GitHub release with all of them and a `SHA256SUMS` manifest. A tag containing `rc`, `beta` or `alpha` is marked as a prerelease.

The version is declared in `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `crates/Cargo.toml`, the helper's `Info.plist` and `packaging/arch/PKGBUILD`. `just bump` keeps them in step, and the workflow refuses a tag whose version differs from them.

```bash
just bump 0.2.0
git push
git tag v0.2.0
git push origin v0.2.0
```

To try the workflow from a branch without publishing, run it by hand from the Actions tab (or `gh workflow run release.yml --ref <branch>`) with `publish` left unchecked. It builds and uploads every artifact to the run. `publish` only takes effect when the run starts from a tag.

The macOS jobs need these repository secrets:

- `APPLE_CERTIFICATE`, the Developer ID Application certificate as a base64 `.p12`
- `APPLE_CERTIFICATE_PASSWORD`, the password of that `.p12`
- `APPLE_SIGNING_IDENTITY`, the certificate's name, for example `Developer ID Application: Dario Paz (FZTU7DUDX7)`
- `APPLE_ID`, `APPLE_PASSWORD` (an app-specific password) and `APPLE_TEAM_ID`, for notarization

Tauri imports the certificate into a temporary keychain, signs the app and the `pendraked` sidecar with the hardened runtime, notarizes and staples the `.app`, and signs the DMG. The bundler does not notarize the disk image, so `scripts/notarize-dmg.sh` submits it, staples it and checks it with `spctl`. The same script works by hand on a locally built DMG.

The Arch package is built with `makepkg` in an `archlinux` container from `packaging/arch/PKGBUILD`, which repackages the `.deb` of the same run. The PKGBUILD also works on its own: `makepkg` downloads the `.deb` from the release, and `updpkgsums` fills in the checksums before an AUR submission.

Windows installers are unsigned. Adding a code signing certificate to the Windows job is still to do.

For a local build of the other macOS architecture, stage the daemon for it first:

```bash
rustup target add x86_64-apple-darwin
just stage-daemon-target x86_64-apple-darwin
pnpm tauri build --target x86_64-apple-darwin
```

# Pendrake Watch-only

Pendrake Watch-only is a watch-only Zcash wallet. A Wallet is one imported UFVK, on
mainnet or regtest, holding no spending keys. A background process built on zingolib
owns the wallet file and syncs continuously, posting a desktop notification for each
newly detected transaction while the window is closed. The wallet file is encrypted
at rest with a passphrase that also locks the UI, so the app stays locked until the
daemon holds the passphrase for the session. The GUI is a Tauri v2 client that talks
to that process over a local socket.

## Architecture

The engine is the `pendrake-core` crate. It builds a watch-only wallet from an
imported UFVK, runs the sync loop, owns the wallet file, and serves the IPC
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
| `pendraked` | Linux, Windows, macOS dev | a click opens the `pendrake://` deep link on Linux and Windows | `just daemon` |
| `PendrakeSync.app` | macOS | clickable, opens the `pendrake://` deep link | `just macos helper` |

So `pendrake-daemon` is not obsolete now that macOS prefers the app. It remains the
production daemon on Linux and Windows, and the fast host for engine work on macOS.

## User flow

One routing fork at launch feeds three top-level states: onboarding, unlock, and the
dashboard. Onboarding branches on the network the UFVK declares and on whether a
session passphrase already exists. The two destructive paths, Start over and Replace,
both collapse back into onboarding and are told apart only by whether the passphrase
survived the wipe.

```
                          ┌─────────────────────────────────┐
                          │ App launch                      │
                          │ GUI probes the IPC socket,      │
                          │ spawns the daemon if nothing    │
                          │ answers                         │
                          └────────────────┬────────────────┘
                                           ▼
                          ┌─────────────────────────────────┐
                          │ Route on daemon state           │
                          │ (exists checked before locked)  │
                          └───┬────────────┬────────────┬────┘
            exists = false    │            │            │   exists = true
                              │            │            │   unlocked
                              ▼            │            ▼
                      ┌──────────────┐     │      ┌────────────┐
                      │ ONBOARDING   │     │      │ DASHBOARD  │◄──────┐
                      └──────┬───────┘     │      └─────┬──────┘       │
                             │      exists = true,      │              │
                             │      locked (no session  │              │
                             │      passphrase)         │              │
                             │             ▼            │              │
                             │      ┌──────────────┐    │              │
                             │      │ UNLOCK       │    │              │
                             │      └──┬────────┬──┘    │              │
                             │  enter  │        │ "Forgot passphrase?" │
                             │  pass.  │        ▼                      │
                             │         │   Start over (wipes ALL,      │
                             │         │   drops session) ─────────────┤
                             │         └──────────────► DASHBOARD       │
                             ▼                                          │
                  ┌────────────────────────┐                           │
                  │ Paste UFVK             │                           │
                  │ network parsed from    │                           │
                  │ the key, not chosen    │                           │
                  └───┬──────────┬─────┬───┘                           │
       testnet key    │ mainnet  │     │ regtest                       │
            │         │          │     │                               │
            ▼         ▼          │     ▼                               │
      rejected   Identity        │  Identity ─► Indexer                │
   "testnet key"     │           │     │  (regtest must supply it;     │
   no Wallet made    └─────┬─────┘     │   mainnet ships a default)    │
                           ▼           │                               │
                    (Set Password)◄────┘  shown only when NO session   │
                           │              passphrase is held           │
                           ▼                                           │
                   import ─► pin N = chain tip ─────────────────────────┘
                                                 lands in Initial scan
```

Replace re-enters this fork from the Settings danger zone. It wipes the current Wallet
but keeps the session passphrase, so onboarding skips Set Password before the new
UFVK import. Start over loses the passphrase, so onboarding shows Set Password again.

## Prerequisites

- Rust, pinned by `rust-toolchain.toml`.
- Node and `pnpm`, at the version pinned in `package.json`.
- [`just`](https://github.com/casey/just), the task runner. The common workflows
  are recipes in the `justfile`, so run `just` to list them.
- `protoc`, which zingolib needs to build the lightwalletd gRPC stubs.
- The Tauri v2 platform prerequisites (see the Tauri docs). On Linux that is the
  webkit2gtk stack. On Windows it is WebView2 and the MSVC build tools.

The committed `crates/Cargo.lock` is required. A yanked transitive dependency only
resolves through it, so leave it in place.

## Usage

From the repo root, install the dependencies and start the app with hot reload:

```
just install
just dev
```

`just dev` builds the release daemon and launches the GUI pinned to that
freshly-built `pendraked`, so it runs the engine you are editing. The daemon does
the heavy scanning, so it is built release.

Tasks live in the `justfile`. Cross-platform ones run by name. Platform-specific
ones live in modules you call as `just <platform> <task>`:

| Task | What it does |
| --- | --- |
| `just dev` | GUI with hot reload against the release daemon |
| `just daemon` | Build the `pendraked` daemon |
| `just check` | Typecheck the frontend and build both Rust workspaces |
| `just fmt` | Format the Rust code |
| `just package` | Build release and bundle the installers |
| `just macos run` | macOS production run: builds the Swift helper, opens the app |
| `just linux run`, `just windows run` | Production run on Linux or Windows |
| `just macos stop`, `just linux stop`, `just windows stop` | Stop that platform's background daemons |

Every platform module loads on every host, so you can invoke another OS's task
from yours, though it will not do anything useful there. Run `just` on its own to
list everything, including the per-platform tasks.

## macOS

There are two daemon options in dev, with a trade-off between them.

For fast iteration on the engine, the `pendraked` binary is enough. Its
notifications appear, but clicking them does nothing, because a loose binary cannot
drive `UNUserNotificationCenter`.

For clickable notifications that open the transaction screen, build the Swift
helper with `just macos helper` (`just macos helper debug` for a faster Swift-only
build). It compiles the embedded engine in release and bundles `PendrakeSync.app`.
The GUI prefers a built `PendrakeSync.app` over the binary and logs which one it
spawned. The app carries a frozen copy of the engine, so rerun `just macos helper`
after any `pendrake-core` change. A missing feature or wrong notification data is
usually a stale app.

Clicking a notification only opens the transaction screen on the registered app
bundle, which is the installed app or `just macos run` (it builds the helper and the
`.app`, then runs both). Under `just dev` a click focuses the window but does not
navigate, because the hot-reload binary is not the registered URL handler.

## Linux

Install Tauri's Linux prerequisites and `protoc`, then run `just dev`. The GUI
spawns `pendraked`, which posts notifications through the session's notification
service. Clicking a notification opens the `pendrake://` deep link through the
desktop's URL handler, which the running GUI is registered for.

## Windows

Install WebView2, the MSVC build tools, and `protoc`, then run `just dev`. The GUI
spawns `pendraked` the same way, and clicking a notification opens the deep link
too. Reliable toast activation in production also needs the installer's
AppUserModelID shortcut.

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

## Storybook

You can access to main's storybook page [here](https://pendrake-watch.dariovp01.workers.dev/).

Note that we intend to migrate away from cloudflare. We are using it temporarily.

## Releasing

Use `just package`.
# The daemon speaks JSON-RPC 2.0, and the Session lock belongs to the connection

The daemon's protocol was newline-delimited JSON with a home-grown envelope: a request
carried `id`, `method` and `params`, a reply carried `id`, `ok` and either `result` or
an error string, and a pushed event carried `event`. It is now JSON-RPC 2.0 on the same
newline-delimited stream. A request adds `"jsonrpc":"2.0"`, a reply carries `result` or
an `error` object with a `code` and a `message`, and a pushed event is a JSON-RPC
notification, a request with a `method` and no `id`. The method names are unchanged and
are Pendrake's own (`getBalance`, `subscribeEvents`) rather than zcashd's. Pushed events use
the `event.` prefix with the event's tag as the rest of the name, so a transaction
arrives as `event.transaction` with the event's fields as `params`.

The reason is a user who ran zallet and asked for a wire protocol they could script
against. The old envelope was JSON-RPC in all but name, so the cost of adopting the real
thing was the envelope and the GUI client, and what it buys is that every language
already has a client. Plain HTTP was rejected as a transport because it cannot carry
server pushes, and the push feed is the product: a watch-only wallet that tells you
when a transaction lands. The transports are therefore stream transports only, the
local socket (or Windows named pipe) and the TCP listener below.

Error codes: the spec's own for a malformed line (`-32700`), a line that is not a
request (`-32600`), an unknown method (`-32601`) and wrong params (`-32602`), then three
of the daemon's own in the server range. `-32000` is a method that ran and failed, with
the message saying why. `-32001` is the Session lock. `-32002` is a TCP session that has
not presented the cookie.

## The optional TCP listener and its cookie

`PENDRAKE_RPC_LISTEN=127.0.0.1:<port>` opens a second listener. It must be a loopback
address, and the daemon refuses to start otherwise; remote access goes over an SSH
tunnel, which is also how one would reach zcashd. On the local socket the owner-only
file mode is the proof of local access (the 2026-09-22 hardening). TCP has no file mode,
so the daemon mints a 32-byte random cookie at startup, writes it hex-encoded to
`rpc.cookie` in the data dir with mode 0600, and removes it on exit. A TCP session's
first call must be `authenticate` with that cookie, and every other call on the
connection is refused with `-32002` until it has. A wrong cookie costs a 250ms delay.
On the socket, `authenticate` is accepted as a no-op so one client can serve both.

With the cookie presented, the session is still locked like any other and needs the
Passphrase. `PENDRAKE_RPC_COOKIE_UNLOCKS=1` relaxes that for headless clients: a session
that presented the cookie starts unlocked whenever the Passphrase is already held. The
trade is explicit, since it makes local file access equal to the Passphrase for the
TCP listener, and it is off by default.

One method is withheld from TCP sessions entirely: `startOver`. It deletes every Wallet
without the Passphrase, which is the point of it on a forgotten Passphrase, but a client
that reached the listener through an SSH tunnel holds only the cookie and lacks even
write access to the data dir. It is refused with `-32000`; the local socket keeps it,
since anyone on the socket could delete the Wallet files directly.

`removeWallet` stays reachable from TCP but carries its own proof: the call takes the
Passphrase and the daemon verifies it against the held one, under the same constant-time
compare and growing backoff as `verifyPassphrase`, before anything is deleted. An
unlocked session alone, which a `cookie_unlocks` TCP client holds without ever knowing
the Passphrase, is therefore not enough to take a Wallet out.

## The Session lock is per connection

ADR-0003's amendment made the lock a single daemon-wide flag: armed at startup, by Sign
Out, and when the last event subscriber disconnected. That last rule existed because a
flag shared by every client had no other way to notice the GUI had gone. With a second
kind of client it breaks three ways: a long-lived bot holding a subscription keeps the
GUI from relocking on quit, an `unlock` from either client unlocks the other, and Sign
Out in the GUI cuts the bot off.

The lock now belongs to the connection. Every connection owns a `Session`: it starts
locked whenever an encrypted Wallet exists, `unlock` clears it for that connection
alone, `lock` (Sign Out) re-arms it for that connection alone, and dropping the
connection relocks it, so the subscriber count is gone. A session that was born
unlocked because the store was empty re-arms its lock once the first encrypted Wallet
exists, the same state a fresh connection starts in; the session that performed the
import is exempt, since it supplied the Passphrase. The re-arm runs on both paths a
session can take, the request loop and the push loop, so a client that only listens
cannot keep the event feed past the lock, and an `unlock` against an empty store
grants no exemption, since it verified nothing. The
Passphrase is still held
once by the service, as before, so unlocking a second session is a constant-time
verification against it, never a second decrypt. Pushed events are gated per session
the same way. `getWalletState` reports `locked` for the asking session. The one global
reading left is the price loop, which parks while no session is unlocked, since a
Fiat value has no one to be shown to.

Two consequences for the GUI. It now holds one connection for the life of the window
instead of one per request, multiplexing requests by id and reading notifications off
the same stream, because the connection is the session. And a dropped connection
(a daemon restart, or any reconnect) lands on a fresh, locked session, so the webview
returns to the unlock screen exactly as it did after a daemon restart before.

One gate was tightened on the way. `importUfvk` is allowed while locked only for a
first import into an empty store, since onboarding needs it before any Passphrase
exists. An import on a locked session used to clear the lock, and later stood in for
the Passphrase after a restart, when wallets sat on disk with no key held: the
import's own Passphrase became the held one and the user's `unlock` was verified
against the attacker's string. It is now refused with `-32001` whenever the store
holds an encrypted Wallet, keyed or not.

`listWallets` answers on a locked session, since the switcher's LifeHashes and
Unavailable marks must render, but a locked session reads every `lastBalance` and
`sync` as absent: a balance waits for `unlock`. The GUI keeps its own last-seen
figures client-side, so the switcher loses nothing while its session is unlocked.

## What was not done

No zcashd method-name compatibility: the user who asked does not need it, and the
domain (Fingerprint-keyed Wallets, Pools, Discreet mode) does not map onto zcashd's.
No HTTP transport, for the reason above. No OpenRPC document yet; the `ts-rs` export
already describes every type, so one can be generated when a third client wants it.

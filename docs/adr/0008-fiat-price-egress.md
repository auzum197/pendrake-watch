# Fiat price display fetches from third parties, off by default behind consent

Pendrake shows balances in ZEC. AUZ-83 adds an optional USD view: a spot USD figure on the
balance and a wavy USD balance chart that marks the ZEC balance daily against the historical
price (see **Fiat value** and **Span** in `CONTEXT.md`). ZEC has no on-chain price, so the
figure comes from outside, which is a new kind of network egress for a privacy-focused
watch-only wallet. This records how that egress is bounded.

## Decision

**Off by default, behind a consent gate.** No price request leaves the device until the user
enables fiat. The dashboard's USD toggle opens a modal that names the third parties and the
IP exposure before the first fetch. A Settings switch turns it back off, which stops all
price egress. The choice is persisted per Wallet (`Meta.fiat_enabled`), and a fresh import
starts private again.

**Backend fetch, never the UI.** All fetching, reconciliation, and caching live in the daemon
(`pendrake-core/src/price.rs`) behind the IPC boundary. The GUI receives numbers, timestamps,
and a confidence flag, and never talks to a price API directly, so egress runs from one place.

**No per-transaction correlation.** Only the current spot and bulk daily series are fetched.
A price is never requested keyed to a transaction's height or date, so a lookup on the wire
can't be tied to wallet activity. The per-transaction USD value in the tx detail is computed
locally from the already-fetched daily series, not from a targeted request.

**Multiple sources, reconciled by median.** Spot is fetched from CoinGecko, Coinbase, and
Kraken. The daily series comes from Coinbase (back to its 2020-12-08 ZEC-USD floor),
cross-checked against CoinGecko (365 days) and Kraken (~720 days), with a bundled CSV for the
pre-2020 tail. A point covered by three or more sources takes the median, two the mean, one
the lone value. Points that spread beyond ~2% carry a `diverged` flag. Single-source points
(the CSV tail) are marked low **Confidence**. The reconciled prices are public ZEC/USD data, not
wallet-specific, so `price_cache.json` is plaintext and survives a Replace.

## Considered options

**Spot only, no history.** Simpler and one fewer source, but it drops the wavy chart the
feature is built around: a balance held flat through a price rally would read as a flat line.

**A single pinned provider.** Fewer requests, but one feed being wrong (or briefly returning
a bad tick) would move the displayed number with nothing to catch it. Median across sources is
the cheap defense, and the issue explicitly asked to reconcile disagreement.

**Route price egress over Tor.** Deferred to its own issue. Routing only price over Tor while
the Indexer (lightwalletd) connection remains in the clear protects the low-sensitivity channel
and leaves the high-sensitivity one exposed, which is theatre. Tor belongs across all egress
at once, and CoinGecko/Coinbase behind Cloudflare frequently block Tor exits anyway.

## Consequences

Enabling fiat is an explicit, reversible privacy trade the user opts into, not a default the
wallet makes for them. The ZEC view always renders, so a price outage degrades to "no USD"
rather than a broken balance. A future reader adding Tor should cover the Indexer channel in
the same change, not bolt it onto price alone. The pre-2020 CSV tail
(`crates/pendrake-core/assets/zec-usd-daily-tail.csv`) is populated from Bitfinex daily
closes back to ZEC's launch (2016-10-29), so the ALL Span waves to inception. Being frozen
historical data, it never needs a refresh.

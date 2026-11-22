# Testnet is a supported network

Pendrake originally accepted mainnet and regtest only; a `uviewtest` key decoded but was refused with a "not supported" verdict. Testnet is now a first-class network end to end: the daemon imports a testnet UFVK against `ChainType::Testnet`, and onboarding shapes its Indexer and Birthday steps for it like any other network. ADR-0002 is unchanged: the network still comes from the key, and the client's `network` field is still only cross-checked against it.

Where mainnet-only infrastructure is involved, testnet follows what the chain actually offers:

- **Indexer.** Testnet opens on `https://testnet.zec.rocks`, the same default zingolib itself falls back to, with a custom entry beside it. The curated region list stays mainnet-only; regtest alone is custom-only, since it has no public default at all.
- **Birthday.** Mainnet projects a date onto a height from a known anchor block. Testnet's difficulty-reset emissions (a 20-minute stall collapses difficulty, so block cadence swings wildly) make that projection unreliable, and a date that lands *after* the wallet's first activity would silently miss transactions. Testnet therefore offers a height only; a date that still reaches the daemon floors to Sapling activation, which misses nothing.
- **Price.** The Fiat value feature prices ZEC from public markets and is consent-gated app-wide; it is untouched here, so a testnet Wallet's fiat marks are meaningless numbers. Per-network price gating is post-v0.

The faker (Storybook and `pnpm dev` mock daemon) mirrors all of this with a testnet chain, testnet address prefixes, and a Testnet option in the lab editor, so the flow is exercisable without a daemon.

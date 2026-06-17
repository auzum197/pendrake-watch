# A Wallet's network is derived from its UFVK and immutable

The network a Wallet syncs against (mainnet or regtest) is parsed from the UFVK's encoding, not chosen separately, and it cannot change for the life of the Wallet. The engine validates the parsed network against the `network` field the client sends and rejects a mismatch, so a mainnet key can never be loaded as regtest. This is structural enforcement of a rule that would otherwise be UI honour-system: the `ImportUfvkArgs.network` field exists today and the engine currently trusts it.

The reason it's worth recording: zingolib binds a wallet to one network, and reusing key material across networks is a real hazard, so a Wallet that could switch networks is both unsupported and unsafe. A future reader seeing the client pass a `network` field might assume it's user-selectable. It isn't, it's a cross-check against what the key already declares.

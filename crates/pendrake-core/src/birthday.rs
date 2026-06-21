//! Resolving a Wallet's Birthday at import.
//!
//! Turns the user's import choice (a height, a date, or blank) into a safe
//! starting block height. It runs offline: no indexer, no I/O, so the daemon can
//! settle the Birthday the moment a key is imported and these paths stay under
//! direct cargo tests.
//!
//! The promise is that a resolved height never sits *after* the user's intent, so
//! no shielded history is missed. Blank and date both floor to Sapling activation,
//! read from the chain params: a watch-only Wallet has no shielded history before
//! Sapling, and that is the earliest block Pendrake supports. An explicit height
//! passes through untouched.

use zcash_protocol::consensus::{NetworkUpgrade, Parameters};
use zingolib::config::ChainType;

use pendrake_ipc::BirthdayInput;

/// Resolve the user's Birthday choice into a starting block height. A blank or a
/// date floors to Sapling activation, the earliest supported block; an explicit
/// height is used as given.
///
/// A date floors rather than back-projecting to a recent height because that needs
/// a recent finalized mainnet block compiled in as an anchor, and the earliest
/// block Pendrake supports is Sapling activation anyway. Swapping in such an anchor
/// later is the only change needed to turn a date into a tighter start.
pub fn resolve_birthday(input: &BirthdayInput, chain: &ChainType) -> u32 {
    let sapling = sapling_activation(chain);
    match *input {
        BirthdayInput::Height(height) => height,
        BirthdayInput::Default | BirthdayInput::Date(_) => sapling,
    }
}

/// Sapling activation for the chain, the floor that misses no shielded history.
fn sapling_activation(chain: &ChainType) -> u32 {
    chain
        .activation_height(NetworkUpgrade::Sapling)
        .map(u32::from)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use zingolib::ActivationHeights;

    fn mainnet() -> ChainType {
        ChainType::Mainnet
    }

    fn regtest() -> ChainType {
        ChainType::Regtest(ActivationHeights::default())
    }

    #[test]
    fn blank_floors_to_sapling() {
        assert_eq!(
            resolve_birthday(&BirthdayInput::Default, &mainnet()),
            sapling_activation(&mainnet())
        );
        assert_eq!(
            resolve_birthday(&BirthdayInput::Default, &regtest()),
            sapling_activation(&regtest())
        );
    }

    #[test]
    fn explicit_height_passes_through() {
        // Used as given, with no Sapling floor applied.
        assert_eq!(
            resolve_birthday(&BirthdayInput::Height(1_000_000), &mainnet()),
            1_000_000
        );
        assert_eq!(resolve_birthday(&BirthdayInput::Height(7), &regtest()), 7);
    }

    #[test]
    fn date_floors_to_sapling() {
        // Nothing before Sapling is supported, so any date lands on activation,
        // at or before the picked day and never after it.
        let some_day = 1_700_000_000;
        assert_eq!(
            resolve_birthday(&BirthdayInput::Date(some_day), &mainnet()),
            sapling_activation(&mainnet())
        );
        // Regtest has no date path in the UI, but the resolver still floors safely.
        assert_eq!(
            resolve_birthday(&BirthdayInput::Date(some_day), &regtest()),
            sapling_activation(&regtest())
        );
    }
}

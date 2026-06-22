//! Resolving a Wallet's Birthday at import.
//!
//! Turns the user's import choice (a height, a date, or blank) into a safe
//! starting block height. It runs offline: no indexer, no I/O, so the daemon can
//! settle the Birthday the moment a key is imported and these paths stay under
//! direct cargo tests.
//!
//! The promise is that a resolved height never sits *after* the user's intent, so
//! no shielded history is missed. A blank floors to Sapling activation, the
//! earliest block Pendrake supports. An explicit height passes through untouched.
//! A mainnet date back-projects from a compiled-in anchor block at the post-Blossom
//! 75s target, leaning earlier so the start lands at or before the picked day.

use zcash_protocol::consensus::{NetworkUpgrade, Parameters};
use zingolib::config::ChainType;

use pendrake_ipc::BirthdayInput;

/// Seconds per block at the post-Blossom target. Earlier eras were slower (150s
/// pre-Blossom), so dividing an elapsed span by this over-counts the blocks in it
/// and lands the estimate at or below the true height.
const BLOCK_TARGET_SECS: i64 = 75;

/// One day of blocks at the post-Blossom target, subtracted as a buffer so the
/// estimate leans earlier and absorbs post-Blossom drift.
const ONE_DAY_BLOCKS: u32 = (86_400 / BLOCK_TARGET_SECS) as u32;

/// A real, finalized mainnet block, the reference for dating a Birthday. Updating
/// it to a more recent block tightens typical starts; any real block keeps the
/// never-later guarantee. Block 3,387,167, header time 2026-06-22 20:34:33 UTC.
/// Source: https://blockchair.com/zcash/block/3387167
const MAINNET_ANCHOR_HEIGHT: u32 = 3_387_167;
const MAINNET_ANCHOR_TIME: i64 = 1_782_160_473;

/// Resolve the user's Birthday choice into a starting block height. A blank floors
/// to Sapling activation, the earliest supported block; an explicit height is used
/// as given; a mainnet date back-projects from the anchor, never landing after the
/// picked day. Regtest has no date reference, so a date there floors to activation.
pub fn resolve_birthday(input: &BirthdayInput, chain: &ChainType) -> u32 {
    let sapling = sapling_activation(chain);
    match *input {
        BirthdayInput::Height(height) => height,
        BirthdayInput::Default => sapling,
        BirthdayInput::Date(secs) => match chain {
            ChainType::Mainnet => mainnet_height_for_date(secs).max(sapling),
            ChainType::Regtest(_) => 1,
            _ => sapling,
        },
    }
}

/// Estimate the mainnet height at `date_secs` (unix), leaning earlier so it never
/// lands after that day. A date at or after the anchor returns the anchor height:
/// the chain only grows, so the anchor sits at or before the true height at any
/// later date, which holds even when this build's anchor is stale.
fn mainnet_height_for_date(date_secs: i64) -> u32 {
    if date_secs >= MAINNET_ANCHOR_TIME {
        return MAINNET_ANCHOR_HEIGHT;
    }
    let blocks_back = (MAINNET_ANCHOR_TIME - date_secs) / BLOCK_TARGET_SECS;
    let projected = i64::from(MAINNET_ANCHOR_HEIGHT) - blocks_back - i64::from(ONE_DAY_BLOCKS);
    projected.max(0) as u32
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
    fn date_at_or_after_anchor_returns_anchor_height() {
        // The chain only grows, so the anchor height is a safe floor for any date
        // the build's anchor doesn't reach yet.
        assert_eq!(
            resolve_birthday(&BirthdayInput::Date(MAINNET_ANCHOR_TIME), &mainnet()),
            MAINNET_ANCHOR_HEIGHT
        );
        assert_eq!(
            resolve_birthday(
                &BirthdayInput::Date(MAINNET_ANCHOR_TIME + 10_000_000),
                &mainnet()
            ),
            MAINNET_ANCHOR_HEIGHT
        );
    }

    #[test]
    fn date_before_anchor_back_projects_earlier() {
        let days = 173i64;
        let date = MAINNET_ANCHOR_TIME - days * 86_400;
        let height = resolve_birthday(&BirthdayInput::Date(date), &mainnet());
        let expected =
            MAINNET_ANCHOR_HEIGHT - (days * 86_400 / BLOCK_TARGET_SECS) as u32 - ONE_DAY_BLOCKS;
        assert_eq!(height, expected);
        // A real recent start: below the anchor, far above the Sapling floor.
        assert!(height < MAINNET_ANCHOR_HEIGHT);
        assert!(height > sapling_activation(&mainnet()));
    }

    #[test]
    fn ancient_date_floors_to_sapling() {
        // 2016-01-01, before Sapling: the projection underflows and floors.
        let twenty_sixteen = 1_451_606_400;
        assert_eq!(
            resolve_birthday(&BirthdayInput::Date(twenty_sixteen), &mainnet()),
            sapling_activation(&mainnet())
        );
    }

    #[test]
    fn regtest_date_floors_to_activation() {
        // Regtest has no date reference, so it ignores the mainnet anchor.
        assert_eq!(
            resolve_birthday(&BirthdayInput::Date(MAINNET_ANCHOR_TIME), &regtest()),
            sapling_activation(&regtest())
        );
    }
}

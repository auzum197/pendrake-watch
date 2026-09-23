#!/usr/bin/env bash
# Notarize a DMG with Apple, staple the ticket to it, and confirm Gatekeeper
# accepts it. Tauri notarizes and staples the .app inside the image and signs
# the image, but does not notarize the image itself, so the DMG needs its own
# ticket before it is safe to download.
#
# Reads APPLE_ID, APPLE_PASSWORD (an app-specific password) and APPLE_TEAM_ID.
# A rejected submission leaves no ticket, so the staple step fails on it.
set -euo pipefail

dmg="${1:?usage: notarize-dmg.sh <path.dmg>}"
: "${APPLE_ID:?APPLE_ID is not set}"
: "${APPLE_PASSWORD:?APPLE_PASSWORD is not set}"
: "${APPLE_TEAM_ID:?APPLE_TEAM_ID is not set}"

xcrun notarytool submit "$dmg" \
    --apple-id "$APPLE_ID" \
    --password "$APPLE_PASSWORD" \
    --team-id "$APPLE_TEAM_ID" \
    --wait
xcrun stapler staple "$dmg"
xcrun stapler validate "$dmg"
spctl --assess --type open --context context:primary-signature --verbose=2 "$dmg"

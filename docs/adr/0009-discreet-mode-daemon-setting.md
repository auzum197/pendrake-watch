# Discreet mode persists in the daemon

Discreet mode (see **Discreet mode** in `CONTEXT.md`) is the eye toggle that masks amounts,
transaction dates, block heights, txids, memo text, and addresses everywhere they render. The
obvious home for a display toggle is frontend state. This records why the flag crosses the IPC
boundary instead.

## Decision

**The flag lives in the daemon, alongside `fiat_enabled`.** Pendrake's reason to exist is
posting a desktop notification when a transaction is detected while the window is closed. That
notification names an amount and a direction ("Received 1.5 ZEC"). A frontend flag cannot
redact it, since the UI may not be running when it posts. With Discreet mode on, the daemon
posts "New transaction detected" with no amount and no direction.

**It survives restarts.** Someone who hides their figures before a screen share needs them
hidden before the window opens. The setting persists to disk and is toggled over IPC from the
sidebar eye.

**It is app-wide, not per-wallet.** Discreet mode is a viewing choice for whoever is at the
screen, so it holds no matter which wallet is active. The flag lives in a shared `settings.json`
at the data root, not in per-wallet `meta.json`. This is where it parts ways with `fiat_enabled`,
which is per-wallet consent to egress and so belongs to the wallet. Switching wallets, importing
a new one, or wiping one all leave the flag untouched. A `meta.discreet` written before this
change seeds the shared setting once on first load.

**Masking is presentation.** The daemon keeps sending real values over IPC and consumes the
flag only for notification text. The UI masks at render time with uniform dots that carry no
magnitude, so the balance chart can still draw the true curve and toggling back needs no
refetch.

## Considered options

**Frontend localStorage flag.** One line of state and no IPC change, but notifications keep
naming amounts while the window is closed, which is the loudest surface the app has.

**Daemon redacts IPC payloads.** Masking in the data layer would blind the chart (the feature
keeps the curve visible) and force a refetch on every toggle. It also adds nothing the threat
model needs: the onlooker sees the screen, never the socket.

**A separate notification-privacy setting.** Two knobs to explain, and "hidden on screen,
shouted by notifications" is exactly the misconfiguration a user would not notice until it bit
them.

## Consequences

The wallet-state payload grows a `discreet` flag and a setter command in the style of
`set_fiat_enabled`, and notification text becomes conditional on it. Persistence lives in a
root-level `settings.json` rather than per-wallet meta, so the value is the same in every
wallet-state payload. The frontend reads the flag from wallet state instead of owning it, so the
eye works from any screen and the choice holds across restarts and wallet switches. Screenshots taken while masked are safe, but real values remain in
memory and on the UDS socket. That matches the shoulder-surfing threat model this feature
serves and no stronger one.

# No page view-transition crossfade; screens animate in on mount

The signed-in screens used the browser View Transitions API (`defaultViewTransition` on the router, with the fade named in `transitions.css`) to crossfade the routed content on each navigation. We removed it. Navigation now swaps the route instantly, and each screen plays its own entrance animation as it mounts (the transaction list's reveal cascade, the balance chart's enter fade, the tx detail's staggered reveals). A "Reduce motion" toggle in Settings, defaulting to the OS `prefers-reduced-motion`, governs those.

The reason is a WebKit performance cliff. A view transition snapshots the whole outgoing page before it can animate. The Activity screen's transaction history is a virtualized list whose scroll container is sized to the full height of every transaction, which is tens of thousands of pixels on a busy wallet. WebKit rasterizes that entire surface to capture the snapshot, so every navigation *away from* Activity stalled in proportion to the history size, while navigating *into* it stayed fast (the list mounts empty, its scroll element attaches a frame later). Entrance animations only ever touch the incoming DOM, so they never snapshot the outgoing page, and navigation cost stops depending on what you are leaving or how large the history is.

## Considered options

Disabling the transition only when leaving Activity (TanStack Router takes a per-navigation `viewTransition: false`) works but is whack-a-mole: any future heavy outgoing screen hits the same capture cost and needs its own exception.

Containing the snapshot with CSS (`contain: paint` on the scroller, `content-visibility: auto` on the rows) was tried and did not help. `overflow: auto` already establishes a clip, and WebKit rasterizes the scroll layer regardless of the containment hints, so the snapshot stayed expensive.

## Consequences

There is no cross-screen morph, the outgoing screen is gone the instant the route swaps and the incoming one animates in over it. That reads as snappy rather than smooth, which is the trade we want here. Re-enabling `defaultViewTransition` would bring the stall straight back on any wallet with a long history, so a future reader who adds it to restore the crossfade is undoing this decision, not adding polish.

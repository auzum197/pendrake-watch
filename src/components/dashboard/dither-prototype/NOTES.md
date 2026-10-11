# Dither chart prototype

Question: how would the Home balance chart and the shell around it read if the chart were drawn with the ordered-dither texture from [dither-kit](https://www.tripwire.sh/dither-kit), and which of the five looks is worth keeping?

- `../dither/dither-paint.ts` ports the kit's column painter: a 4×4 Bayer threshold per cell, the series colour at varying alpha (dense at the floor, dissolving up to the value line), with `gradient`, `dotted`, `hatched` and `solid` variants and the three bloom presets.
- `dither-area.tsx` (now in `../dither/`, shipped on Home) is the chart. A low-res canvas (one cell per `cell` css px) scaled up with `image-rendering: pixelated`, a second blurred canvas composited `plus-lighter` for the bloom, winking sparkles on a 100ms tick, a continuous scrub marker on the canvas and a gliding DOM tooltip (90ms ease-out transform) that reads the balance at the hovered instant. Axes and grid are DOM, not canvas. The surface eases toward new data at 0.18 per frame, so range switches tween the way the recharts chart does. `kind` picks area, line (a thin glow band hugging the line) or bars (balance at the end of each of `bins` buckets). Entrance is a left-to-right reveal over 800ms, played once per chart instance, skipped under reduced motion or the app's motion toggle.
- `dither-wash.tsx` ports DitherGradient: a static dither ramp used as a background band in the shells.
- `fake-data.ts` is the seeded generator from `BalanceChart.stories.tsx`, anchored to today so the range filter has data to show, plus a random walk per pool for the sparklines.
- `shells.tsx` holds five shells. None touch IPC or the router beyond what `TxList` needs.

## Storybook

`Prototype/Dither chart` has the five chart looks, a Playground with every knob, a Bars story and a Gallery with all five side by side.

1. Gradient bloom. The kit's default: 2px cells, bloom low, sparkles, step curve, brand blue.
2. Hatched blueprint. Diagonal hatch, no bloom, no sparkles. Crisp and quiet.
3. Dotted halftone. Open dots at 3px, aura bloom, linear curve, ironwood green.
4. Chunky pixels. 5px cells, no bloom, step curve, amber. The retro extreme.
5. Line aura. Line only with a glow band, bloom high, on the USD series.

`Prototype/Dither shell` has five shells. Each has its own chart look baked in, and the controls (`ink`, `variant`, `bloom`, `cell`) override it.

1. Classic. Today's layout, chart swapped for the dithered one.
2. Hero wash. The chart becomes the backdrop of the hero card with the balance over it, and the sidebar gets a brand dither wash rising from the bottom. Pool tiles with sparklines below.
3. Terminal. Monospace, square corners, hairline borders, ironwood accent, hatched fill. The sidebar header is a dither band.
4. Split. Icon rail, a tall dotted chart on the left, the balance and pool tiles stacked on the right.
5. Topbar bars. No sidebar, translucent top bar, the chart as dithered bars over a page-wide wash.

## Observations

- Opacity-only fills do hold up on the card and on the ink sidebar without a second palette.
- At 2px the dither reads as texture, at 3px as a pattern, at 5px as pixels. 2 or 3 is the range for the dashboard.
- Bloom aura is only visible over a dark surface. Low is enough on the card.
- Sparkles are charming for a second and then distracting on a chart you look at every day. Candidate for hover-only.
- The tooltip glide is the one piece of motion that earns its place. The entrance reveal should stay a first-mount thing.

Verdict: _TBD_

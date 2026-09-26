# Onboarding backdrop prototype

Question: can the onboarding backdrop be split into layers, with the trees drawn in code and moving in the wind, and still look like the painting?

- `split-layers.py` paints the trees out of `src/assets/onboarding-backdrop.jpg` and writes six layers to `layers/` (sky, far, near, water, house, ground). Each layer carries a bleed band so it can later drift for parallax without holes.
- `trees.ts` grows seeded silhouette trees where the painted ones stood and animates them on a canvas.
- `dither.ts` repaints the trees with the painting's stipple (the `dither` prop). Each tree takes the darkest colour of the painting where it stands.
- `invert.ts` swaps every colour with its opposite by brightness rank, keeping the painting's palette (the `inverted` prop, story Inverted).
- A tried and rejected approach removed the painted undergrowth and replaced it with code shrubs. It flattened the ground's structure.
- Storybook: `Prototype/Onboarding backdrop` (Scene, Gusty, Dithered, Layers).

Regenerate the layers with `python split-layers.py [debug-dir]` (needs numpy and opencv-python-headless).

Verdict: _TBD_
